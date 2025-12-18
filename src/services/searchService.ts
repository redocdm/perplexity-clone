// Types for web search results
export interface SearchResult {
    id: string;
    title: string;
    url: string;
    snippet: string;
    favicon?: string;
    domain: string;
    publishedDate?: string;
    // Phase 2 enhancements
    evidence?: string;
    relevanceScore?: number;
}

export interface SearchResponse {
    results: SearchResult[];
    query: string;
    searchTime?: number;
    engine?: string;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return url;
    }
}

/**
 * Get favicon URL for a domain
 */
function getFaviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Search the web using SerpAPI (requires API key)
 * Free tier: 100 searches/month
 */
export async function searchWithSerpAPI(query: string): Promise<SearchResponse> {
    const apiKey = import.meta.env.VITE_SERPAPI_KEY;

    if (!apiKey) {
        console.warn('VITE_SERPAPI_KEY not set, using mock search results');
        return mockSearch(query);
    }

    try {
        const params = new URLSearchParams({
            q: query,
            api_key: apiKey,
            engine: 'google',
            num: '5',
        });

        // Note: SerpAPI needs a backend proxy due to CORS
        // For now, we'll use the direct API (works in dev with proxy)
        const response = await fetch(`https://serpapi.com/search.json?${params}`);

        if (!response.ok) {
            throw new Error(`SerpAPI error: ${response.status}`);
        }

        const data = await response.json();

        const results: SearchResult[] = (data.organic_results || []).slice(0, 5).map((result: {
            title: string;
            link: string;
            snippet: string;
            date?: string;
        }, index: number) => {
            const domain = extractDomain(result.link);
            return {
                id: `serp-${index}`,
                title: result.title,
                url: result.link,
                snippet: result.snippet || '',
                domain,
                favicon: getFaviconUrl(domain),
                publishedDate: result.date,
            };
        });

        return { results, query };
    } catch (error) {
        console.error('SerpAPI search failed:', error);
        return mockSearch(query);
    }
}

/**
 * Search the web using Brave Search API
 * Free tier: 2000 searches/month
 */
export async function searchWithBrave(query: string): Promise<SearchResponse> {
    const apiKey = import.meta.env.VITE_BRAVE_SEARCH_KEY;

    if (!apiKey) {
        console.warn('VITE_BRAVE_SEARCH_KEY not set, using mock search results');
        return mockSearch(query);
    }

    try {
        const params = new URLSearchParams({
            q: query,
            count: '5',
        });

        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
            headers: {
                'Accept': 'application/json',
                'X-Subscription-Token': apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Brave Search error: ${response.status}`);
        }

        const data = await response.json();

        const results: SearchResult[] = (data.web?.results || []).slice(0, 5).map((result: {
            title: string;
            url: string;
            description: string;
            page_age?: string;
        }, index: number) => {
            const domain = extractDomain(result.url);
            return {
                id: `brave-${index}`,
                title: result.title,
                url: result.url,
                snippet: result.description || '',
                domain,
                favicon: getFaviconUrl(domain),
                publishedDate: result.page_age,
            };
        });

        return { results, query };
    } catch (error) {
        console.error('Brave Search failed:', error);
        return mockSearch(query);
    }
}

/**
 * Mock search results for development/demo
 * Returns relevant-looking fake results based on query keywords
 */
export function mockSearch(query: string): SearchResponse {
    const keywords = query.toLowerCase();

    // Generate contextual mock results based on query
    const mockResults: SearchResult[] = [
        {
            id: 'mock-1',
            title: `${query} - Wikipedia`,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
            snippet: `A comprehensive overview of ${query}. This article covers the key concepts, history, and modern applications...`,
            domain: 'en.wikipedia.org',
            favicon: getFaviconUrl('en.wikipedia.org'),
        },
        {
            id: 'mock-2',
            title: `Understanding ${query} | A Complete Guide`,
            url: `https://www.example.com/guide/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`,
            snippet: `Learn everything you need to know about ${query}. Our comprehensive guide covers fundamentals to advanced topics...`,
            domain: 'example.com',
            favicon: getFaviconUrl('example.com'),
        },
        {
            id: 'mock-3',
            title: `${query} Explained Simply - Medium`,
            url: `https://medium.com/topic/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`,
            snippet: `Breaking down ${query} into simple, understandable concepts. Perfect for beginners looking to understand the basics...`,
            domain: 'medium.com',
            favicon: getFaviconUrl('medium.com'),
        },
    ];

    // Add technology-specific sources
    if (keywords.includes('programming') || keywords.includes('code') || keywords.includes('javascript') || keywords.includes('react') || keywords.includes('typescript')) {
        mockResults.push({
            id: 'mock-4',
            title: `${query} - Stack Overflow`,
            url: `https://stackoverflow.com/questions/tagged/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`,
            snippet: `Community discussions and solutions related to ${query}. Find answers from experienced developers...`,
            domain: 'stackoverflow.com',
            favicon: getFaviconUrl('stackoverflow.com'),
        });
    }

    // Add science-specific sources  
    if (keywords.includes('quantum') || keywords.includes('physics') || keywords.includes('science') || keywords.includes('computer')) {
        mockResults.push({
            id: 'mock-5',
            title: `${query} Research - Nature`,
            url: `https://www.nature.com/search?q=${encodeURIComponent(query)}`,
            snippet: `Latest research and scientific discoveries about ${query}. Peer-reviewed articles and publications...`,
            domain: 'nature.com',
            favicon: getFaviconUrl('nature.com'),
        });
    }

    return {
        results: mockResults.slice(0, 5),
        query,
    };
}

/**
 * Send telemetry event to backend
 */
export async function sendTelemetry(type: 'search_started' | 'search_succeeded' | 'search_failed' | 'llm_started' | 'llm_completed' | 'llm_failed', data?: {
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
            body: JSON.stringify({
                type,
                ...data,
            }),
        });
    } catch (error) {
        // Silently fail telemetry - don't break the app
        console.warn('Telemetry failed:', error);
    }
}

/**
 * Main search function - uses backend API or falls back to direct calls
 */
export async function webSearch(query: string): Promise<SearchResponse> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // Try backend API first (Phase 2)
    try {
        await sendTelemetry('search_started', { query });
        const startTime = Date.now();
        
        const response = await fetch(`${apiUrl}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`Backend search failed: ${response.status}`);
        }

        const data: SearchResponse = await response.json();
        const duration = Date.now() - startTime;
        
        await sendTelemetry('search_succeeded', {
            query,
            duration,
            metadata: { engine: data.engine, resultCount: data.results.length },
        });

        return data;
    } catch (error) {
        console.warn('Backend search failed, falling back to direct calls:', error);
        
        await sendTelemetry('search_failed', {
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Fallback to direct API calls (Phase 1 behavior)
        if (import.meta.env.VITE_BRAVE_SEARCH_KEY) {
            return searchWithBrave(query);
        }

        if (import.meta.env.VITE_SERPAPI_KEY) {
            return searchWithSerpAPI(query);
        }

        // Final fallback to mock
        return mockSearch(query);
    }
}
