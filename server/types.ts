// Shared types for backend and frontend
export interface SearchResult {
    id: string;
    title: string;
    url: string;
    snippet: string;
    favicon?: string;
    domain: string;
    publishedDate?: string;
    // Enhanced fields for Phase 2
    evidence?: string; // Extracted evidence snippet
    relevanceScore?: number; // Re-ranking score
}

export interface SearchResponse {
    results: SearchResult[];
    query: string;
    searchTime?: number; // Time taken in ms
    engine?: string; // Which engine was used
    isMockSearch?: boolean; // Flag to indicate if mock data was used
}

export interface TelemetryEvent {
    type: 'search_started' | 'search_succeeded' | 'search_failed' | 'llm_started' | 'llm_completed' | 'llm_failed';
    query?: string;
    duration?: number; // in ms
    error?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
}

