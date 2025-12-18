import type { Message } from '../services/geminiService';
import type { SearchResult } from '../services/searchService';
import { MarkdownWithCitations } from './MarkdownWithCitations';
import { AgentThinkingPanel, type AgentStep } from './AgentThinkingPanel';

interface ResultsAreaProps {
    messages: Message[];
    streamingContent: string;
    isStreaming: boolean;
    error: string | null;
    sources?: SearchResult[];
    onCitationClick?: (sourceIndex: number) => void;
    isAgentMode?: boolean;
    agentThinking?: string | null;
    agentProgress?: string | null;
    agentSteps?: AgentStep[];
    agentEvents?: string[];
}

// AI Avatar icon
const AIAvatar = () => (
    <div className="answer-card__avatar">AI</div>
);

// User Avatar icon
const UserAvatar = () => (
    <div className="answer-card__avatar" style={{ background: 'var(--text-tertiary)' }}>U</div>
);

// Error icon
const ErrorIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);


export function ResultsArea({ messages, streamingContent, isStreaming, error, sources, onCitationClick, isAgentMode, agentThinking, agentProgress, agentSteps, agentEvents }: ResultsAreaProps) {
    if (error) {
        return (
            <div className="error-message">
                <ErrorIcon />
                <span>{error}</span>
            </div>
        );
    }

    return (
        <div className="results-area">
            {messages.map((message, index) => (
                <div
                    key={index}
                    className={`answer-card ${message.role === 'user' ? 'answer-card--user' : ''}`}
                    style={{
                        animationDelay: `${index * 0.1}s`,
                        marginBottom: 'var(--spacing-md)'
                    }}
                >
                    <div className="answer-card__header">
                        {message.role === 'user' ? <UserAvatar /> : <AIAvatar />}
                        <span className="answer-card__label">
                            {message.role === 'user' ? 'You' : 'AI Assistant'}
                        </span>
                    </div>
                    <div className="answer-card__content">
                        {message.role === 'assistant' ? (
                            <MarkdownWithCitations 
                                content={message.content} 
                                sources={sources}
                                onCitationClick={onCitationClick}
                            />
                        ) : (
                            <MarkdownWithCitations content={message.content} />
                        )}
                    </div>
                </div>
            ))}

            {/* Agent Thinking Panel */}
            {isAgentMode && agentSteps && agentSteps.length > 0 && (
                <AgentThinkingPanel steps={agentSteps} isExpanded={isStreaming} />
            )}

            {/* Agent mode indicators */}
            {isStreaming && isAgentMode && (
                <div className="agent-status">
                    {agentThinking && (
                        <div className="agent-status__thinking">
                            <div className="agent-status__icon">🤔</div>
                            <span>{agentThinking}</span>
                        </div>
                    )}
                    {agentProgress && (
                        <div className="agent-status__progress">
                            <div className="agent-status__icon">⚙️</div>
                            <span>{agentProgress}</span>
                        </div>
                    )}
                    {agentEvents && agentEvents.length > 0 && (
                        <div className="agent-status__log">
                            {agentEvents.map((event, idx) => (
                                <div key={idx} className="agent-status__log-line">
                                    {event}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Streaming response */}
            {isStreaming && (
                <div className="answer-card">
                    <div className="answer-card__header">
                        <AIAvatar />
                        <span className="answer-card__label">AI Assistant</span>
                        {isAgentMode && (
                            <span className="agent-badge" title="Agent Mode: Multi-step reasoning enabled">
                                Agent
                            </span>
                        )}
                        <div className="loading-indicator">
                            <div className="loading-dots">
                                <span className="loading-dot"></span>
                                <span className="loading-dot"></span>
                                <span className="loading-dot"></span>
                            </div>
                        </div>
                    </div>
                    <div className="answer-card__content">
                        <MarkdownWithCitations 
                            content={streamingContent} 
                            sources={sources}
                            onCitationClick={onCitationClick}
                        />
                        {streamingContent && <span className="cursor-blink"></span>}
                    </div>
                </div>
            )}
        </div>
    );
}
