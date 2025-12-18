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
    };
}

/**
 * Main search function - tries available APIs or falls back to mock
 */
export async function performSearch(query: string): Promise<SearchResponse> {
    logger.log({ type: 'search_started', query });

    // Try Brave first (more generous free tier), then SerpAPI, finally mock
    if (process.env.BRAVE_SEARCH_KEY) {
        try {
            return await searchWithBrave(query);
        } catch (error) {
            console.error('Brave search failed, trying SerpAPI:', error);
        }
    }

    if (process.env.SERPAPI_KEY) {
        try {
            return await searchWithSerpAPI(query);
        } catch (error) {
            console.error('SerpAPI search failed, using mock:', error);
        }
    }

    // Fallback to mock for development
    return mockSearch(query);
}

