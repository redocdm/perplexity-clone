import type { SearchResult, SearchResponse } from '../types.js';
import { logger } from '../utils/logger.js';

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
 * Build a concise search query from the full user query.
 *
 * Goals:
 * - Preserve the user's core intent (topic, constraints, timeframe).
 * - Stay within typical web search query length limits (~100-120 chars).
 * - Avoid blind truncation by preferring key terms over filler words.
 *
 * This is a heuristic, non-LLM summarizer that can later be upgraded to use an LLM.
 */
function buildSearchQuery(originalQuery: string): string {
    const trimmed = originalQuery.trim();
    if (trimmed.length <= 120) {
        return trimmed;
    }

    // Basic tokenization
    const words = trimmed.split(/\s+/);

    // Common English stopwords to de-emphasize
    const STOPWORDS = new Set([
        'the', 'a', 'an', 'and', 'or', 'but',
        'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with',
        'about', 'into', 'through', 'over', 'between',
        'is', 'are', 'was', 'were', 'be', 'being', 'been',
        'how', 'what', 'when', 'where', 'why', 'which', 'who',
        'would', 'could', 'should', 'can', 'will', 'do', 'does', 'did',
        'that', 'this', 'these', 'those',
        'within', 'without', 'then', 'than',
    ]);

    // Keep non-stopwords and moderately long words first
    const importantWords: string[] = [];
    for (const w of words) {
        const lower = w.toLowerCase();
        const isStopword = STOPWORDS.has(lower);
        if (!isStopword || w.length > 6) {
            importantWords.push(w);
        }
    }

    // Fallback if everything got filtered out
    const baseWords = importantWords.length > 0 ? importantWords : words;

    // Take the first N words that keep us under ~110-120 chars
    const maxChars = 110;
    const selected: string[] = [];
    let lengthSoFar = 0;

    for (const w of baseWords) {
        const extra = selected.length === 0 ? w.length : w.length + 1; // +1 for space
        if (lengthSoFar + extra > maxChars) {
            break;
        }
        selected.push(w);
        lengthSoFar += extra;
    }

    let condensed = selected.join(' ').trim();

    // Final hard safety: if still too long, truncate at a word boundary
    if (condensed.length > 120) {
        const cut = condensed.slice(0, 120);
        const lastSpace = cut.lastIndexOf(' ');
        condensed = (lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim();
    }

    // As a last resort, if we somehow ended up empty, return a safe slice of the original
    if (!condensed) {
        const fallbackCut = trimmed.slice(0, 120);
        const lastSpace = fallbackCut.lastIndexOf(' ');
        return (lastSpace > 60 ? fallbackCut.slice(0, lastSpace) : fallbackCut).trim();
    }

    return condensed;
}

/**
 * Search using Brave Search API
 */
export async function searchWithBrave(query: string): Promise<SearchResponse> {
    const apiKey = process.env.BRAVE_SEARCH_KEY;
    const startTime = Date.now();

    if (!apiKey) {
        throw new Error('BRAVE_SEARCH_KEY not configured');
    }

    try {
        const params = new URLSearchParams({
            q: query,
            count: '10', // Get more results for re-ranking
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
        const duration = Date.now() - startTime;

        const results: SearchResult[] = (data.web?.results || []).map((result: {
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

        logger.log({
            type: 'search_succeeded',
            query,
            duration,
            metadata: { engine: 'brave', resultCount: results.length },
        });

        return {
            results,
            query,
            searchTime: duration,
            engine: 'brave',
            isMockSearch: false,
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.log({
            type: 'search_failed',
            query,
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: { engine: 'brave' },
        });
        throw error;
    }
}

/**
 * Search using SerpAPI
 */
export async function searchWithSerpAPI(query: string): Promise<SearchResponse> {
    const apiKey = process.env.SERPAPI_KEY;
    const startTime = Date.now();

    if (!apiKey) {
        throw new Error('SERPAPI_KEY not configured');
    }

    try {
        const params = new URLSearchParams({
            q: query,
            api_key: apiKey,
            engine: 'google',
            num: '10', // Get more results for re-ranking
        });

        const response = await fetch(`https://serpapi.com/search.json?${params}`);

        if (!response.ok) {
            throw new Error(`SerpAPI error: ${response.status}`);
        }

        const data = await response.json();
        const duration = Date.now() - startTime;

        const results: SearchResult[] = (data.organic_results || []).map((result: {
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

        logger.log({
            type: 'search_succeeded',
            query,
            duration,
            metadata: { engine: 'serpapi', resultCount: results.length },
        });

        return {
            results,
            query,
            searchTime: duration,
            engine: 'serpapi',
            isMockSearch: false,
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.log({
            type: 'search_failed',
            query,
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: { engine: 'serpapi' },
        });
        throw error;
    }
}

/**
 * Mock search for development/testing
 */
export function mockSearch(query: string): SearchResponse {
    const keywords = query.toLowerCase();
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

    return {
        results: mockResults.slice(0, 5),
        query,
        searchTime: 50,
        engine: 'mock',
        isMockSearch: true, // Flag that this is mock data
    };
}

/**
 * Main search function - tries available APIs or falls back to mock
 */
export async function performSearch(query: string): Promise<SearchResponse> {
    logger.log({ type: 'search_started', query });

    // Build a condensed search query for external engines, while preserving
    // the original user query for logging and answer generation.
    const searchQuery = buildSearchQuery(query);
    if (searchQuery !== query) {
        console.log('[Search] Condensed query for web search:', {
            originalLength: query.length,
            condensedLength: searchQuery.length,
            condensed: searchQuery,
        });
    }

    // Try Brave first (more generous free tier), then SerpAPI, finally mock
    if (process.env.BRAVE_SEARCH_KEY) {
        try {
            const result = await searchWithBrave(searchQuery);
            console.log('[Search] Brave search succeeded:', {
                resultCount: result.results.length,
                engineQuery: result.query,
            });

            // Preserve the original user query in the response we return to the caller
            return { ...result, query };
        } catch (error) {
            console.error('[Search] Brave search failed, trying SerpAPI:', error);
        }
    } else {
        console.warn('[Search] BRAVE_SEARCH_KEY not found in environment');
    }

    if (process.env.SERPAPI_KEY) {
        try {
            const result = await searchWithSerpAPI(searchQuery);
            console.log('[Search] SerpAPI search succeeded:', {
                resultCount: result.results.length,
                engineQuery: result.query,
            });

            // Preserve the original user query in the response
            return { ...result, query };
        } catch (error) {
            console.error('[Search] SerpAPI search failed, using mock:', error);
        }
    } else {
        console.warn('[Search] SERPAPI_KEY not found in environment');
    }

    // Fallback to mock for development
    console.warn('[Search] Falling back to mock search - no working API keys');
    const mockResponse = mockSearch(query);
    logger.log({
        type: 'search_succeeded',
        query,
        metadata: {
            engine: 'mock',
            resultCount: mockResponse.results.length,
            warning: 'Using mock search results - no API keys configured or all APIs failed',
        },
    });
    return mockResponse;
}

