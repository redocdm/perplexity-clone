import { analyzeQuery } from './queryAnalyzer';
import { planTasks, type Task } from './taskPlanner';
import { executeMultiHopSearch, type MultiHopResult } from './multiHopSearch';
import { generateStreamingResponse, type Message, type StreamCallbacks } from './geminiService';
import type { SearchResult } from './searchService';

/**
 * Format search results into context string for AI
 */
function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const sourcesText = results.map((result, index) => {
    const evidence = result.evidence || result.snippet;
    return `[${index + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}${evidence !== result.snippet ? `\nEvidence: ${evidence}` : ''}`;
  }).join('\n\n');

  return `Web Search Results:\n\n${sourcesText}`;
}

export interface AgentCallbacks extends StreamCallbacks {
    onThinking?: (thought: string) => void;
    onToolCall?: (tool: string, params: any) => void;
    onProgress?: (step: string, details?: any) => void;
    onSourcesUpdate?: (sources: SearchResult[]) => void;
    onStepResults?: (step: number, task: Task, results: SearchResult[]) => void;
    onStepComplete?: (step: number, summary: string) => void;
    onMockSearchDetected?: (isMock: boolean) => void;
}

/**
 * Agent service that orchestrates planning, tool calling, and multi-step reasoning
 */
export async function agentSearch(
    query: string,
    conversationHistory: Message[],
    callbacks: AgentCallbacks,
    settings?: {
        tone?: 'casual' | 'professional' | 'technical';
        depth?: 'brief' | 'detailed' | 'comprehensive';
        citationStrictness?: 'relaxed' | 'standard' | 'strict';
    }
): Promise<void> {
    try {
        // Step 1: Analyze query complexity
        callbacks.onThinking?.('Analyzing query complexity...');
        const analysis = await analyzeQuery(query);
        callbacks.onProgress?.('Query analyzed', { complexity: analysis.complexity });

        if (analysis.complexity === 'simple' && !analysis.needsMultiStep) {
            // Simple query - use standard flow
            callbacks.onProgress?.('Using simple search mode');
            const { webSearch } = await import('./searchService');
            const searchResponse = await webSearch(query);
            callbacks.onToolCall?.('web_search', { query, isMockSearch: searchResponse.isMockSearch });
            callbacks.onMockSearchDetected?.(searchResponse.isMockSearch || false);
            
            // Update sources callback
            callbacks.onSourcesUpdate?.(searchResponse.results);

            const searchContext = formatSearchContext(searchResponse.results);
            await generateStreamingResponse(
                query,
                conversationHistory,
                callbacks,
                searchContext,
                settings
            );
            return;
        }

        // Step 2: Plan execution
        callbacks.onThinking?.('Planning execution steps...');
        const tasks = await planTasks(query, analysis.suggestedSteps);
        callbacks.onProgress?.(`Planned ${tasks.length} search step${tasks.length > 1 ? 's' : ''}`, {
            steps: tasks.map(t => t.description),
        });

        // Step 3: Execute multi-hop search
        callbacks.onThinking?.('Executing search plan...');
        const multiHopResult = await executeMultiHopSearch(query, analysis, (step, total, task, results) => {
            callbacks.onProgress?.(`Step ${step}/${total}: ${task.description}`, {
                task: task.description,
                resultsCount: results.length,
            });
            callbacks.onToolCall?.('web_search', { query: task.searchQuery, step, total });
            // Call step results callback with full details
            callbacks.onStepResults?.(step, task, results);
            callbacks.onStepComplete?.(step, `Found ${results.length} result${results.length !== 1 ? 's' : ''} for: ${task.searchQuery}`);
        });

        // Check for mock search and notify
        if (multiHopResult.hasMockSearch) {
            callbacks.onMockSearchDetected?.(true);
        }

        // Update sources callback
        callbacks.onSourcesUpdate?.(multiHopResult.allResults);

        // If we have no results at all, provide a helpful message
        if (multiHopResult.allResults.length === 0) {
            callbacks.onThinking?.('No search results found. Generating response from knowledge base...');
        }

        // Step 4: Synthesize final answer
        callbacks.onThinking?.('Synthesizing answer from all sources...');
        const combinedContext = formatSearchContext(multiHopResult.allResults);
        
        // If no search results, still try to generate a response (LLM can use its knowledge)
        if (multiHopResult.allResults.length === 0) {
            const noResultsContext = `No web search results were found for the query: "${query}". Please provide a helpful answer based on your knowledge, and mention that specific sources were not available.`;
            await generateStreamingResponse(
                query,
                conversationHistory,
                callbacks,
                noResultsContext,
                settings
            );
            return;
        }
        
        // Enhance context with execution plan
        const planContext = multiHopResult.executionPlan.length > 1
            ? `\n\nExecution Plan:\n${multiHopResult.executionPlan.map((t, i) => `${i + 1}. ${t.description}: ${t.searchQuery}`).join('\n')}\n`
            : '';

        const enhancedContext = `${combinedContext}${planContext}\n\nUser Question: ${query}\n\nPlease synthesize a comprehensive answer using information from all the search steps above. Include inline citations [1], [2], etc. where appropriate.`;

        await generateStreamingResponse(
            query,
            conversationHistory,
            callbacks,
            enhancedContext,
            settings
        );
    } catch (error) {
        console.error('Agent search failed:', error);
        callbacks.onError?.(error instanceof Error ? error : new Error('Agent search failed'));
    }
}

/**
 * Check if agent mode should be used for a query
 */
export function shouldUseAgentMode(query: string): boolean {
    // Simple heuristics - can be enhanced
    const complexIndicators = [
        /compare|versus|vs|difference between/i,
        /how to|step by step|process|guide/i,
        /best.*and.*best/i,
        /multiple|several|various|different/i,
    ];

    return complexIndicators.some(pattern => pattern.test(query));
}

