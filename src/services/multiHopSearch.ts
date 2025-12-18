import { planTasks, type Task } from './taskPlanner';
import { webSearch, type SearchResult, type SearchResponse } from './searchService';

export interface MultiHopProgressCallback {
    (step: number, total: number, task: Task, results: SearchResult[]): void;
}

export interface MultiHopResult {
    finalResults: SearchResult[];
    allResults: SearchResult[];
    executionPlan: Task[];
    analysis: {
        needsMultiStep: boolean;
        complexity: string;
    };
    hasMockSearch?: boolean; // Flag if any step used mock search
}

/**
 * Execute multi-hop search with planning and sequential execution
 */
export async function executeMultiHopSearch(
    query: string,
    analysis: { needsMultiStep: boolean; complexity: string; suggestedSteps?: string[] },
    onProgress?: MultiHopProgressCallback
): Promise<MultiHopResult> {
    if (!analysis.needsMultiStep) {
        // Simple query - single search
        const searchResponse = await webSearch(query);
        const hasMock = searchResponse.isMockSearch || false;
        // If no results, try a simplified query
        if (searchResponse.results.length === 0) {
            const simplifiedQuery = query.split(':')[0].split('?')[0].trim();
            if (simplifiedQuery !== query && simplifiedQuery.length > 0) {
                const retryResponse = await webSearch(simplifiedQuery);
                if (retryResponse.results.length > 0) {
                    return {
                        finalResults: retryResponse.results,
                        allResults: retryResponse.results,
                        executionPlan: [{
                            id: 'task_0',
                            description: query,
                            searchQuery: simplifiedQuery,
                            dependsOn: [],
                        }],
                        analysis: {
                            needsMultiStep: false,
                            complexity: analysis.complexity,
                        },
                        hasMockSearch: retryResponse.isMockSearch || false,
                    };
                }
            }
        }
        return {
            finalResults: searchResponse.results,
            allResults: searchResponse.results,
            executionPlan: [{
                id: 'task_0',
                description: query,
                searchQuery: query,
                dependsOn: [],
            }],
            analysis: {
                needsMultiStep: false,
                complexity: analysis.complexity,
            },
            hasMockSearch: hasMock,
        };
    }

    // Step 2: Plan tasks
    const tasks = await planTasks(query, analysis.suggestedSteps);
    const allResults: SearchResult[] = [];
    const executedTasks: Task[] = [];
    const taskResults: Map<string, SearchResult[]> = new Map();
    let hasMockSearch = false;

    // Step 3: Execute tasks sequentially (respecting dependencies)
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // Check if dependencies are met
        if (task.dependsOn && task.dependsOn.length > 0) {
            const unmetDeps = task.dependsOn.filter(depId => !taskResults.has(depId));
            if (unmetDeps.length > 0) {
                console.warn(`Task ${task.id} has unmet dependencies:`, unmetDeps);
            }
        }

        // Build search query - keep it concise (max 100 chars for search APIs)
        let searchQuery = task.searchQuery;
        if (searchQuery.length > 100) {
            // Truncate to first 100 chars, but try to end at a word boundary
            const truncated = searchQuery.substring(0, 100);
            const lastSpace = truncated.lastIndexOf(' ');
            searchQuery = lastSpace > 50 ? truncated.substring(0, lastSpace) : truncated;
        }

        // Execute search with retry logic
        let searchResponse = await webSearch(searchQuery);
        let results = searchResponse.results;
        if (searchResponse.isMockSearch) {
            hasMockSearch = true;
        }
        
        // If no results, try a simplified version of the query
        if (results.length === 0 && searchQuery.length > 20) {
            // Extract key terms (first 3-4 words)
            const words = searchQuery.split(/\s+/).filter(w => w.length > 2);
            const simplifiedQuery = words.slice(0, 4).join(' ');
            if (simplifiedQuery !== searchQuery && simplifiedQuery.length > 0) {
                console.log(`Retrying search with simplified query: "${simplifiedQuery}"`);
                const retryResponse = await webSearch(simplifiedQuery);
                if (retryResponse.results.length > 0) {
                    results = retryResponse.results;
                    searchQuery = simplifiedQuery;
                    if (retryResponse.isMockSearch) {
                        hasMockSearch = true;
                    }
                }
            }
        }
        
        allResults.push(...results);
        taskResults.set(task.id, results);
        executedTasks.push({ ...task, searchQuery });

        // Call progress callback with full result details
        if (onProgress) {
            onProgress(i + 1, tasks.length, { ...task, searchQuery }, results);
        }
    }

    // If we have no results at all, return at least an empty structure
    // The agent will handle this gracefully
    return {
        finalResults: allResults.length > 0 ? allResults.slice(-10) : [], // Last 10 results for final answer
        allResults: allResults.length > 0 ? allResults : [],
        executionPlan: executedTasks,
        analysis: {
            needsMultiStep: true,
            complexity: analysis.complexity,
        },
        hasMockSearch,
    };
}

