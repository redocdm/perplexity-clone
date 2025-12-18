import type { Message } from '../services/geminiService';
import type { SearchResult } from '../services/searchService';
import { MarkdownWithCitations } from './MarkdownWithCitations';

interface ResultsAreaProps {
    messages: Message[];
    streamingContent: string;
    isStreaming: boolean;
    error: string | null;
    sources?: SearchResult[];
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


export function ResultsArea({ messages, streamingContent, isStreaming, error, sources }: ResultsAreaProps) {
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
                            <MarkdownWithCitations content={message.content} sources={sources} />
                        ) : (
                            <MarkdownWithCitations content={message.content} />
                        )}
                    </div>
                </div>
            ))}

            {/* Streaming response */}
            {isStreaming && (
                <div className="answer-card">
                    <div className="answer-card__header">
                        <AIAvatar />
                        <span className="answer-card__label">AI Assistant</span>
                        <div className="loading-indicator">
                            <div className="loading-dots">
                                <span className="loading-dot"></span>
                                <span className="loading-dot"></span>
                                <span className="loading-dot"></span>
                            </div>
                        </div>
                    </div>
                    <div className="answer-card__content">
                        <MarkdownWithCitations content={streamingContent} sources={sources} />
                        {streamingContent && <span className="cursor-blink"></span>}
                    </div>
                </div>
            )}
        </div>
    );
}
