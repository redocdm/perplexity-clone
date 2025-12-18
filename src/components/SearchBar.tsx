import { useState, type FormEvent, type KeyboardEvent } from 'react';

interface SearchBarProps {
    onSubmit: (query: string) => void;
    isLoading: boolean;
    placeholder?: string;
    compact?: boolean;
}

// Arrow icon for submit button
const ArrowIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

export function SearchBar({ onSubmit, isLoading, placeholder, compact }: SearchBarProps) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (query.trim() && !isLoading) {
            onSubmit(query.trim());
            setQuery('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form className="search-bar" onSubmit={handleSubmit}>
            <div className={`search-bar__container ${compact ? 'search-bar__container--compact' : ''}`}>
                <textarea
                    className="search-bar__input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || "Ask anything..."}
                    disabled={isLoading}
                    rows={1}
                    style={{
                        resize: 'none',
                        minHeight: compact ? '24px' : '28px',
                        maxHeight: '120px',
                        overflow: 'auto'
                    }}
                />
                <button
                    type="submit"
                    className="search-bar__submit"
                    disabled={!query.trim() || isLoading}
                    aria-label="Submit search"
                >
                    {isLoading ? (
                        <div className="loading-dots">
                            <span className="loading-dot"></span>
                            <span className="loading-dot"></span>
                            <span className="loading-dot"></span>
                        </div>
                    ) : (
                        <ArrowIcon />
                    )}
                </button>
            </div>
        </form>
    );
}
