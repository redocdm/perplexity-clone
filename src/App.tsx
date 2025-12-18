import { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { ResultsArea } from './components/ResultsArea';
import { FollowUpSuggestions } from './components/FollowUpSuggestions';
// SourceCarousel removed - citations now shown in collapsible section at end of responses
import { ConversationSidebar } from './components/ConversationSidebar';
import { ConversationSettings as ConversationSettingsModal } from './components/ConversationSettings';
import { ConversationActions } from './components/ConversationActions';
import { useTheme } from './hooks/useTheme';
import {
  generateStreamingResponse,
  generateFollowUpSuggestions,
  type Message
} from './services/geminiService';
import { webSearch, type SearchResult } from './services/searchService';
import { agentSearch, shouldUseAgentMode } from './services/agentService';
import {
  createConversation,
  updateConversation,
  saveConversation,
} from './services/conversationService';
import {
  type Conversation,
  DEFAULT_SETTINGS,
  type ConversationSettings,
} from './types/conversation';
import './App.css';

// Example quick action suggestions for home page
const QUICK_ACTIONS = [
  "Explain quantum computing simply",
  "Best practices for React performance",
  "How does machine learning work?",
  "Compare TypeScript vs JavaScript",
];

/**
 * Send telemetry event to backend
 */
async function sendTelemetry(type: 'search_started' | 'search_succeeded' | 'search_failed' | 'llm_started' | 'llm_completed' | 'llm_failed', data?: {
  query?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  try {
    await fetch(`${apiUrl}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...data }),
    });
  } catch (error) {
    // Silently fail telemetry
    console.warn('Telemetry failed:', error);
  }
}

/**
 * Format search results into context string for AI
 * Enhanced with evidence snippets for Phase 2
 */
function formatSearchContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  const sourcesText = results.map((result, index) => {
    const evidence = result.evidence || result.snippet;
    return `[${index + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}${evidence !== result.snippet ? `\nEvidence: ${evidence}` : ''}`;
  }).join('\n\n');

  return `Web Search Results:\n\n${sourcesText}`;
}

function App() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [isMockSearch, setIsMockSearch] = useState(false);
  
  // Phase 3: Conversation management
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversationSettings, setConversationSettings] = useState<ConversationSettings>(DEFAULT_SETTINGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Phase 4: Agent mode
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [agentThinking, setAgentThinking] = useState<string | null>(null);
  const [agentProgress, setAgentProgress] = useState<string | null>(null);
  const [agentSteps, setAgentSteps] = useState<Array<{
    stepNumber: number;
    task: { id: string; description: string; searchQuery: string; dependsOn?: string[] };
    results: SearchResult[];
    isComplete: boolean;
  }>>([]);
  const [agentEvents, setAgentEvents] = useState<string[]>([]);
  
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Auto-save conversation when messages or sources change (debounced)
  useEffect(() => {
    if (messages.length === 0 || isStreaming) return;

    const timeoutId = setTimeout(() => {
      if (currentConversation) {
        // Update existing conversation
        const updated = updateConversation(currentConversation.id, {
          messages,
          sources,
        });
        if (updated) {
          setCurrentConversation(updated);
        }
      } else if (messages.length > 0) {
        // Create new conversation only if we have messages
        const newConv = createConversation(messages, sources, conversationSettings);
        saveConversation(newConv);
        setCurrentConversation(newConv);
      }
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [messages.length, sources.length, isStreaming]);

  // Load conversation from URL share parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) {
      // In a real app, this would fetch from backend
      // For now, we'll just clear the share param
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSearch = async (query: string) => {
    setError(null);
    setIsStreaming(true);
    setStreamingContent('');
    setFollowUpSuggestions([]);
    setSources([]);
    setAgentThinking(null);
    setAgentProgress(null);
    setAgentEvents([]);

    // Add user message immediately
    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Determine if we should use agent mode
      const useAgent = shouldUseAgentMode(query);
      setIsAgentMode(useAgent);

      if (useAgent) {
        // Use agent mode for complex queries
        await agentSearch(
          query,
          messages,
          {
            onThinking: (thought) => {
              setAgentThinking(thought);
              setAgentEvents(prev => [...prev, `Thinking: ${thought}`]);
            },
            onProgress: (step, details) => {
              setAgentProgress(step);
              if (details) {
                console.log('Agent progress:', step, details);
              }
              setAgentEvents(prev => [...prev, `Progress: ${step}`]);
            },
            onToolCall: (tool, params) => {
              console.log('Agent tool call:', tool, params);
              const querySnippet = typeof params?.query === 'string' ? ` – ${params.query}` : '';
              setAgentEvents(prev => [...prev, `Tool: ${tool}${querySnippet}`]);
            },
            onSourcesUpdate: (newSources) => {
              setSources(newSources);
            },
            onMockSearchDetected: (isMock) => {
              setIsMockSearch(isMock);
            },
            onStepResults: (stepNumber, task, results) => {
              setAgentSteps(prev => {
                const updated = [...prev];
                const existingIndex = updated.findIndex(s => s.stepNumber === stepNumber);
                const stepData = {
                  stepNumber,
                  task: {
                    id: task.id,
                    description: task.description,
                    searchQuery: task.searchQuery,
                    dependsOn: task.dependsOn,
                  },
                  results,
                  isComplete: true,
                };
                if (existingIndex >= 0) {
                  updated[existingIndex] = stepData;
                } else {
                  updated.push(stepData);
                }
                return updated.sort((a, b) => a.stepNumber - b.stepNumber);
              });
            },
            onStepComplete: (stepNumber, summary) => {
              console.log(`Step ${stepNumber} complete:`, summary);
            },
            onToken: (token) => {
              setStreamingContent(prev => prev + token);
            },
            onComplete: async (fullText) => {
              // Quality check (only if we have sources)
              if (sources.length > 0) {
                try {
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                  const qualityResponse = await fetch(`${apiUrl}/api/quality/check`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      responseText: fullText,
                      sources: sources,
                    }),
                  });

                  if (qualityResponse.ok) {
                    const qualityCheck = await qualityResponse.json();
                    if (!qualityCheck.isValid && qualityCheck.issues.length > 0) {
                      setQualityWarning(qualityCheck.issues[0]);
                    } else {
                      setQualityWarning(null);
                    }
                  }
                } catch (err) {
                  console.warn('Quality check failed:', err);
                }
              } else {
                // No sources - clear any existing warnings
                setQualityWarning(null);
              }

              const assistantMessage: Message = { role: 'assistant', content: fullText };
              const updatedMessages = [...messages, userMessage, assistantMessage];
              setMessages(updatedMessages);
              setStreamingContent('');
              setIsStreaming(false);
              setAgentThinking(null);
              setAgentProgress(null);
              setAgentEvents([]);

              if (currentConversation) {
                const updated = updateConversation(currentConversation.id, {
                  messages: updatedMessages,
                  sources: sources,
                });
                if (updated) {
                  setCurrentConversation(updated);
                }
              }

              setIsLoadingSuggestions(true);
              const suggestions = await generateFollowUpSuggestions(query, fullText);
              setFollowUpSuggestions(suggestions);
              setIsLoadingSuggestions(false);
            },
            onError: async (err) => {
              setError(err.message || 'An error occurred during agent search');
              setIsStreaming(false);
              setStreamingContent('');
              setAgentThinking(null);
              setAgentProgress(null);
            },
          },
          conversationSettings
        );
        return;
      }

      // Standard search flow for simple queries
      const searchResponse = await webSearch(query);
      setSources(searchResponse.results);
      setIsMockSearch(searchResponse.isMockSearch || false);

      // Quality guardrails: Check if we have any sources
      // Be more lenient - allow 1 result, especially if it's from a real API
      if (searchResponse.results.length === 0) {
        setError('No search results found. Please try rephrasing your query.');
        setIsStreaming(false);
        await sendTelemetry('search_failed', {
          query,
          error: 'No results',
          metadata: { resultCount: 0, isMockSearch: searchResponse.isMockSearch },
        });
        return;
      }

      // Warn if we have only 1 result and it's mock data, but still proceed
      if (searchResponse.results.length === 1 && searchResponse.isMockSearch) {
        console.warn('Only 1 mock result found - proceeding anyway');
      }

      // Format search results as context
      const searchContext = formatSearchContext(searchResponse.results);

      // Generate response with streaming and search context
      const llmStartTime = new Date().getTime();
      await sendTelemetry('llm_started', { query });

      await generateStreamingResponse(
        query,
        messages, // Pass existing history
        {
          onToken: (token) => {
            setStreamingContent(prev => prev + token);
          },
          onComplete: async (fullText) => {
            const llmDuration = Date.now() - llmStartTime;
            
            // Quality check: Call backend quality service
            try {
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
              const qualityResponse = await fetch(`${apiUrl}/api/quality/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  responseText: fullText,
                  sources: searchResponse.results,
                }),
              });

              if (qualityResponse.ok) {
                const qualityCheck = await qualityResponse.json();
                if (!qualityCheck.isValid && qualityCheck.issues.length > 0) {
                  setQualityWarning(qualityCheck.issues[0]); // Show first issue
                } else {
                  setQualityWarning(null);
                }

                await sendTelemetry('llm_completed', {
                  query,
                  duration: llmDuration,
                  metadata: {
                    hasCitations: /\[\d+\]/.test(fullText),
                    sourceCount: searchResponse.results.length,
                    responseLength: fullText.length,
                    qualityScore: qualityCheck.score,
                    citationCoverage: qualityCheck.citationCoverage,
                    citationValidity: qualityCheck.citationValidity,
                  },
                });
              }
            } catch (err) {
              console.warn('Quality check failed:', err);
              // Fallback to basic check
              const hasCitations = /\[\d+\]/.test(fullText);
              if (!hasCitations && searchResponse.results.length > 0) {
                setQualityWarning('Response may lack proper citations');
              }
            }

            // Add assistant message to history
            const assistantMessage: Message = { role: 'assistant', content: fullText };
            const updatedMessages = [...messages, userMessage, assistantMessage];
            setMessages(updatedMessages);
            setStreamingContent('');
            setIsStreaming(false);

            // Update conversation with new sources
            if (currentConversation) {
              const updated = updateConversation(currentConversation.id, {
                messages: updatedMessages,
                sources: searchResponse.results,
              });
              if (updated) {
                setCurrentConversation(updated);
              }
            }

            // Generate follow-up suggestions
            setIsLoadingSuggestions(true);
            const suggestions = await generateFollowUpSuggestions(query, fullText);
            setFollowUpSuggestions(suggestions);
            setIsLoadingSuggestions(false);
          },
          onError: async (err) => {
            const llmDuration = Date.now() - llmStartTime;
            setError(err.message || 'An error occurred while generating the response');
            setIsStreaming(false);
            setStreamingContent('');
            
            await sendTelemetry('llm_failed', {
              query,
              duration: llmDuration,
              error: err.message,
            });
          },
        },
        searchContext, // Pass search context for citations
        conversationSettings // Pass conversation settings
      );
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
      setIsStreaming(false);
      setAgentThinking(null);
      setAgentProgress(null);
    }
  };

  const handleQuickAction = (action: string) => {
    handleSearch(action);
  };

  const handleFollowUpSelect = (suggestion: string) => {
    handleSearch(suggestion);
  };

  const handleCitationClick = (sourceIndex: number) => {
    // Currently just validates index; scroll-to-source handled in Source list
    if (sourceIndex < 0 || sourceIndex >= sources.length) return;
  };

  // Phase 3: Conversation handlers
  const handleNewConversation = () => {
    setMessages([]);
    setSources([]);
    setFollowUpSuggestions([]);
    setError(null);
    setQualityWarning(null);
    setCurrentConversation(null);
    setConversationSettings(DEFAULT_SETTINGS);
    setAgentSteps([]);
    setIsAgentMode(false);
    setIsMockSearch(false);
    setAgentEvents([]);
  };

  const handleLoadConversation = (conversation: Conversation) => {
    setMessages(conversation.messages);
    setSources(conversation.sources);
    setCurrentConversation(conversation);
    setConversationSettings(conversation.settings);
    setError(null);
    setQualityWarning(null);
    setFollowUpSuggestions([]);
  };

  const handleSettingsChange = (settings: ConversationSettings) => {
    setConversationSettings(settings);
    if (currentConversation) {
      updateConversation(currentConversation.id, { settings });
    }
  };

  const handleShare = (shareUrl: string) => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      // Show toast notification (can be enhanced later)
      alert('Share link copied to clipboard!');
    });
  };

  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onNewConversation={handleNewConversation}
        onOpenConversations={() => setIsSidebarOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <ConversationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectConversation={handleLoadConversation}
        currentConversationId={currentConversation?.id}
      />

      {isSettingsOpen && (
        <ConversationSettingsModal
          settings={conversationSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      <main className={`main ${hasMessages ? 'main--top' : 'main--centered'}`}>
        {!hasMessages ? (
          // Home state - centered search
          <div className="search-section">
            <h1 className="search-section__title">
              <span className="gradient-text">Ask anything.</span>
              <br />
              Get instant answers.
            </h1>
            <p className="search-section__subtitle">
              Powered by advanced AI with real-time web search and source citations.
            </p>
            <SearchBar
              onSubmit={handleSearch}
              isLoading={isStreaming}
              placeholder="Ask anything..."
            />
            <div className="quick-actions">
              {QUICK_ACTIONS.map((action, index) => (
                <button
                  key={index}
                  className="quick-action"
                  onClick={() => handleQuickAction(action)}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Results state - messages with fixed bottom input
          <>
            <div className="results-section" ref={resultsRef}>
              {/* Conversation actions */}
              {currentConversation && (
                <ConversationActions
                  conversation={currentConversation}
                  onShare={handleShare}
                />
              )}

              {/* Quality warning */}
              {qualityWarning && (
                <div className="quality-warning">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{qualityWarning}</span>
                  <button 
                    className="quality-warning__dismiss"
                    onClick={() => setQualityWarning(null)}
                    aria-label="Dismiss warning"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Mock search warning */}
              {isMockSearch && (
                <div className="quality-warning quality-warning--info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Mock search results are being used. Configure API keys for real web search results.</span>
                  <button 
                    className="quality-warning__dismiss"
                    onClick={() => setIsMockSearch(false)}
                    aria-label="Dismiss warning"
                  >
                    ×
                  </button>
                </div>
              )}

              <ResultsArea
                messages={messages}
                streamingContent={streamingContent}
                isStreaming={isStreaming}
                error={error}
                sources={sources}
                onCitationClick={handleCitationClick}
                isAgentMode={isAgentMode}
                agentThinking={agentThinking}
                agentProgress={agentProgress}
                agentSteps={agentSteps}
                agentEvents={agentEvents}
              />

              {/* Follow-up suggestions after AI response */}
              {!isStreaming && messages.length > 0 && (
                <FollowUpSuggestions
                  suggestions={followUpSuggestions}
                  onSelect={handleFollowUpSelect}
                  isLoading={isLoadingSuggestions}
                />
              )}
            </div>

            {/* Fixed bottom input bar */}
            <div className="bottom-input-bar">
              <div className="bottom-input-bar__container">
                <SearchBar
                  onSubmit={handleSearch}
                  isLoading={isStreaming}
                  placeholder="Ask a follow-up..."
                  compact
                />
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default App;
