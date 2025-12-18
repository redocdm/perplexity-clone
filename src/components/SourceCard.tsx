import type { SearchResult } from '../services/searchService';

interface SourceCardProps {
    source: SearchResult;
    index: number;
    onClick?: () => void;
    dataSourceIndex?: number;
}

// External link icon
const ExternalLinkIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
);

export function SourceCard({ source, index, onClick, dataSourceIndex }: SourceCardProps) {
    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            window.open(source.url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div 
            className="source-card" 
            onClick={handleClick} 
            role="button" 
            tabIndex={0}
            data-source-index={dataSourceIndex !== undefined ? dataSourceIndex : index}
        >
            <div className="source-card__number">{index + 1}</div>
            <div className="source-card__content">
                <div className="source-card__header">
                    <img
                        src={source.favicon || `https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
                        alt=""
                        className="source-card__favicon"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    <span className="source-card__domain">{source.domain}</span>
                    <ExternalLinkIcon />
                </div>
                <h3 className="source-card__title">{source.title}</h3>
                <p className="source-card__snippet">{source.snippet}</p>
                {source.publishedDate && (
                    <span className="source-card__date">{source.publishedDate}</span>
                )}
            </div>
        </div>
    );
}
