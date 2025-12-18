import { useState } from 'react';
import type { SearchResult } from '../services/searchService';

interface CitationsListProps {
    citations: number[]; // Array of citation indices (1-indexed)
    sources: SearchResult[];
    onCitationClick?: (sourceIndex: number) => void;
}

// Chevron down icon
const ChevronDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

// Chevron up icon
const ChevronUp = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

export function CitationsList({ citations, sources, onCitationClick }: CitationsListProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (citations.length === 0 || sources.length === 0) {
        return null;
    }

    // Get unique, valid citations
    const uniqueCitations = [...new Set(citations)].filter(c => c >= 1 && c <= sources.length).sort((a, b) => a - b);

    if (uniqueCitations.length === 0) {
        return null;
    }

    // Get favicons for cited sources (limit to first 3 for display)
    const citedSources = uniqueCitations
        .slice(0, 3)
        .map(citationIndex => sources[citationIndex - 1])
        .filter(Boolean);

    return (
        <div className="citations-list">
            <button
                className="citations-list__toggle"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <div className="citations-list__favicons">
                    {citedSources.map((source, index) => (
                        <img
                            key={source.id}
                            src={source.favicon || `https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`}
                            alt=""
                            className="citations-list__favicon"
                            style={{ zIndex: citedSources.length - index }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ))}
                </div>
                <span className="citations-list__count">
                    {uniqueCitations.length} {uniqueCitations.length === 1 ? 'source' : 'sources'}
                </span>
                {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </button>

            {isExpanded && (
                <div className="citations-list__content">
                    {uniqueCitations.map((citationIndex) => {
                        const sourceIndex = citationIndex - 1;
                        const source = sources[sourceIndex];
                        
                        if (!source) return null;

                        return (
                            <div
                                key={citationIndex}
                                className="citations-list__item"
                                onClick={() => onCitationClick?.(sourceIndex)}
                            >
                                <div className="citations-list__item-header">
                                    <div className="citations-list__item-number">{citationIndex}</div>
                                    <div className="citations-list__item-info">
                                        <div className="citations-list__item-domain">
                                            <img
                                                src={source.favicon || `https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`}
                                                alt=""
                                                className="citations-list__item-favicon"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                            <span>{source.domain}</span>
                                        </div>
                                        <h4 className="citations-list__item-title">{source.title}</h4>
                                        <p className="citations-list__item-snippet">
                                            {source.evidence || source.snippet}
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="citations-list__item-link"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    View source →
                                </a>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

