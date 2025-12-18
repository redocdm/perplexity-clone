import { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { ResultsArea } from './components/ResultsArea';
import { FollowUpSuggestions } from './components/FollowUpSuggestions';
import { SourceCarousel } from './components/SourceCarousel';
import { useTheme } from './hooks/useTheme';
import {
  generateStreamingResponse,
  generateFollowUpSuggestions,
  type Message
} from './services/geminiService';
import { webSearch, type SearchResult } from './services/searchService';
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
  const [isSearching, setIsSearching] = useState(false);
  const [scrollToSourceIndex, setScrollToSourceIndex] = useState<number | undefined>(undefined);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (resultsRef.current) {
      resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSearch = async (query: string) => {
    setError(null);
    setIsStreaming(true);
    setStreamingContent('');
    setFollowUpSuggestions([]);
    setIsSearching(true);
    setSources([]);

    // Add user message immediately
    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Perform web search first
      const searchResponse = await webSearch(query);
      setSources(searchResponse.results);
      setIsSearching(false);

      // Quality guardrails: Check if we have sufficient sources
      if (searchResponse.results.length < 2) {
        setError('Insufficient search results. Please try rephrasing your query.');
        setIsStreaming(false);
        setIsSearching(false);
        await sendTelemetry('search_failed', {
          query,
          error: 'Insufficient results',
          metadata: { resultCount: searchResponse.results.length },
        });
        return;
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
            setMessages(prev => [...prev, assistantMessage]);
            setStreamingContent('');
            setIsStreaming(false);

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
            setIsSearching(false);
            
            await sendTelemetry('llm_failed', {
              query,
              duration: llmDuration,
              error: err.message,
            });
          },
        },
        searchContext // Pass search context for citations
      );
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
      setIsStreaming(false);
      setIsSearching(false);
    }
  };

  const handleQuickAction = (action: string) => {
    handleSearch(action);
  };

  const handleFollowUpSelect = (suggestion: string) => {
    handleSearch(suggestion);
  };

  const handleCitationClick = (sourceIndex: number) => {
    // Validate index is within bounds
    if (sourceIndex >= 0 && sourceIndex < sources.length) {
      setScrollToSourceIndex(sourceIndex);
      // Reset after a short delay to allow re-triggering
      setTimeout(() => setScrollToSourceIndex(undefined), 1000);
    }
  };

  const hasMessages = messages.length > 0 || isStreaming;

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />

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

              <ResultsArea
                messages={messages}
                streamingContent={streamingContent}
                isStreaming={isStreaming}
                error={error}
                sources={sources}
                onCitationClick={handleCitationClick}
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
