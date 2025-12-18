interface FollowUpSuggestionsProps {
    suggestions: string[];
    onSelect: (suggestion: string) => void;
    isLoading?: boolean;
}

// Arrow icon for suggestions
const ArrowRightIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

// Lightbulb icon for title
const LightbulbIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
);

export function FollowUpSuggestions({ suggestions, onSelect, isLoading }: FollowUpSuggestionsProps) {
    if (isLoading) {
        return (
            <div className="follow-up-suggestions">
                <div className="follow-up-suggestions__title">
                    <LightbulbIcon />
                    <span>Generating suggestions...</span>
                </div>
                <div className="loading-dots" style={{ marginTop: '8px' }}>
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div className="follow-up-suggestions">
            <div className="follow-up-suggestions__title">
                <LightbulbIcon />
                <span>Related questions</span>
            </div>
            <div className="follow-up-suggestions__list">
                {suggestions.map((suggestion, index) => (
                    <button
                        key={index}
                        className="follow-up-suggestion"
                        onClick={() => onSelect(suggestion)}
                    >
                        <ArrowRightIcon />
                        <span>{suggestion}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
