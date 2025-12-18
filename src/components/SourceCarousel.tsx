import { useRef, useState, useEffect } from 'react';
import { SourceCard } from './SourceCard';
import type { SearchResult } from '../services/searchService';

interface SourceCarouselProps {
    sources: SearchResult[];
    isLoading?: boolean;
}

// Chevron icons for navigation
const ChevronLeft = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
    </svg>
);

const ChevronRight = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

// Globe icon for sources header
const GlobeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

interface SourceCarouselProps {
    sources: SearchResult[];
    isLoading?: boolean;
    scrollToIndex?: number; // New prop for scrolling to a specific source
}

export function SourceCarousel({ sources, isLoading, scrollToIndex }: SourceCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollButtons = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        updateScrollButtons();
        const ref = scrollRef.current;
        if (ref) {
            ref.addEventListener('scroll', updateScrollButtons);
            return () => ref.removeEventListener('scroll', updateScrollButtons);
        }
    }, [sources]);

    // Scroll to specific source when scrollToIndex changes
    useEffect(() => {
        if (scrollToIndex !== undefined && scrollRef.current && sources.length > 0) {
            const sourceCard = scrollRef.current.children[scrollToIndex] as HTMLElement;
            if (sourceCard) {
                sourceCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [scrollToIndex, sources.length]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 300;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="source-carousel">
                <div className="source-carousel__header">
                    <GlobeIcon />
                    <span>Searching the web...</span>
                </div>
                <div className="source-carousel__loading">
                    <div className="source-card source-card--skeleton">
                        <div className="skeleton-shimmer"></div>
                    </div>
                    <div className="source-card source-card--skeleton">
                        <div className="skeleton-shimmer"></div>
                    </div>
                    <div className="source-card source-card--skeleton">
                        <div className="skeleton-shimmer"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (sources.length === 0) {
        return null;
    }

    return (
        <div className="source-carousel">
            <div className="source-carousel__header">
                <GlobeIcon />
                <span>Sources ({sources.length})</span>
            </div>

            <div className="source-carousel__wrapper">
                {canScrollLeft && (
                    <button
                        className="source-carousel__nav source-carousel__nav--left"
                        onClick={() => scroll('left')}
                        aria-label="Scroll left"
                    >
                        <ChevronLeft />
                    </button>
                )}

                <div className="source-carousel__scroll" ref={scrollRef}>
                    {sources.map((source, index) => (
                        <SourceCard 
                            key={source.id} 
                            source={source} 
                            index={index}
                            dataSourceIndex={index}
                        />
                    ))}
                </div>

                {canScrollRight && (
                    <button
                        className="source-carousel__nav source-carousel__nav--right"
                        onClick={() => scroll('right')}
                        aria-label="Scroll right"
                    >
                        <ChevronRight />
                    </button>
                )}
            </div>
        </div>
    );
}
