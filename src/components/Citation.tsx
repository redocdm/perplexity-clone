import { useState } from 'react';
import type { SearchResult } from '../services/searchService';

interface CitationProps {
    index: number;
    source?: SearchResult;
}

export function Citation({ index, source }: CitationProps) {
    const [isHovered, setIsHovered] = useState(false);

    if (!source) {
        return <span className="citation citation--missing">[{index}]</span>;
    }

    return (
        <span
            className="citation"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            [{index}]
            {isHovered && (
                <div className="citation-tooltip">
                    <div className="citation-tooltip__header">
                        <img
                            src={source.favicon || `https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`}
                            alt=""
                            className="citation-tooltip__favicon"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        <span className="citation-tooltip__domain">{source.domain}</span>
                    </div>
                    <h4 className="citation-tooltip__title">{source.title}</h4>
                    <p className="citation-tooltip__snippet">
                        {source.evidence || source.snippet}
                    </p>
                    <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="citation-tooltip__link"
                        onClick={(e) => e.stopPropagation()}
                    >
                        View source →
                    </a>
                </div>
            )}
        </span>
    );
}

