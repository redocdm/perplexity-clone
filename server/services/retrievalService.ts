import type { SearchResult } from '../types.js';

/**
 * Domain blacklist - low-quality or mock domains
 */
const DOMAIN_BLACKLIST = [
    'example.com',
    'test.com',
    'localhost',
    '127.0.0.1',
];

/**
 * Trusted domains that get quality boost
 */
const TRUSTED_DOMAINS = [
    'wikipedia.org',
    'edu',
    'gov',
    'nature.com',
    'stackoverflow.com',
    'github.com',
    'reddit.com',
    'medium.com',
    'investopedia.com',
    'forbes.com',
    'techcrunch.com',
    'arstechnica.com',
];

/**
 * Check if a result appears to be a mock/generated result
 */
export function isMockResult(result: SearchResult, query: string): boolean {
    const domain = result.domain.toLowerCase();
    const url = result.url.toLowerCase();
    const title = result.title.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Check domain blacklist
    if (DOMAIN_BLACKLIST.some(blacklisted => domain.includes(blacklisted))) {
        return true;
    }
    
    // Check for Wikipedia pages where title exactly matches query (likely mock)
    if (domain.includes('wikipedia.org')) {
        const encodedQuery = queryLower.replace(/\s+/g, '_');
        if (url.includes(encodedQuery) && title === queryLower) {
            return true;
        }
    }
    
    // Check for example.com URLs with query in path
    if (domain.includes('example.com')) {
        const querySlug = queryLower.replace(/\s+/g, '-');
        if (url.includes(querySlug)) {
            return true;
        }
    }
    
    // Check for suspicious URL patterns (query encoded in path)
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    if (queryWords.length > 0) {
        const suspiciousPattern = queryWords.slice(0, 3).join('-');
        if (url.includes(suspiciousPattern) && (domain.includes('example.com') || domain.includes('test'))) {
            return true;
        }
    }
    
    // Check if title is exactly the query (common in mock results)
    // But for very long queries (>100 chars), be more lenient as exact matches
    // might be legitimate for complex topics
    const isLongQuery = query.length > 100;
    if (!isLongQuery && (title === queryLower || title === `${queryLower} - wikipedia` || title === `understanding ${queryLower}`)) {
        return true;
    }
    
    return false;
}

/**
 * Calculate domain credibility score
 */
function calculateDomainCredibility(domain: string): number {
    const domainLower = domain.toLowerCase();
    
    // Blacklisted domains
    if (DOMAIN_BLACKLIST.some(blacklisted => domainLower.includes(blacklisted))) {
        return -5;
    }
    
    // High credibility domains
    if (domainLower.endsWith('.edu') || domainLower.endsWith('.gov')) {
        return 5;
    }
    
    // Known reputable domains
    if (TRUSTED_DOMAINS.some(trusted => domainLower.includes(trusted))) {
        return 3;
    }
    
    // Default score
    return 1;
}

/**
 * Calculate URL validity score
 */
function calculateUrlValidity(url: string, query: string): number {
    const urlLower = url.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);
    
    // Suspicious patterns
    if (urlLower.includes('example.com') || urlLower.includes('test.com')) {
        return -3;
    }
    
    // Check for query encoded in path (suspicious for mock data)
    if (queryWords.length > 0) {
        const suspiciousPattern = queryWords.slice(0, 3).join('-');
        if (urlLower.includes(suspiciousPattern) && (urlLower.includes('example') || urlLower.includes('test'))) {
            return -3;
        }
    }
    
    // Normal URL structure
    return 2;
}

/**
 * Calculate snippet quality score
 */
function calculateSnippetQuality(snippet: string): number {
    if (snippet.length < 30) {
        return -2;
    }
    
    // +1 per 50 chars, max +3
    return Math.min(3, Math.floor(snippet.length / 50));
}

/**
 * Calculate title relevance score
 */
function calculateTitleRelevance(title: string, query: string): number {
    const titleLower = title.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    // For very long queries (>100 chars), be more lenient with exact matches
    // as they might be legitimate results, not just mock data
    const isLongQuery = query.length > 100;
    
    // Exact query match (often indicates mock data)
    // But for long queries, this is less suspicious
    if (titleLower === queryLower) {
        return isLongQuery ? 0 : -1; // Don't penalize long queries
    }
    
    // Contains key terms
    const matchCount = queryWords.filter(word => titleLower.includes(word)).length;
    if (matchCount >= queryWords.length / 2) {
        return 2;
    }
    
    return 0;
}

/**
 * Enhanced quality scoring with multiple signals
 */
function calculateQualityScore(result: SearchResult, query: string): number {
    let score = 0;
    
    // For very long queries, use a simplified version for scoring
    // This prevents over-penalizing results due to query length
    const scoringQuery = query.length > 150 
        ? query.split(/\s+/).slice(0, 10).join(' ') // First 10 words
        : query;
    
    // Domain credibility
    score += calculateDomainCredibility(result.domain);
    
    // URL validity (use original query for pattern detection)
    score += calculateUrlValidity(result.url, query);
    
    // Snippet quality
    score += calculateSnippetQuality(result.snippet);
    
    // Title relevance (use simplified query for long queries)
    score += calculateTitleRelevance(result.title, scoringQuery);
    
    // Basic relevance (keyword matching) - use simplified query
    const queryLower = scoringQuery.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    const titleLower = result.title.toLowerCase();
    const snippetLower = result.snippet.toLowerCase();
    
    queryWords.forEach(word => {
        if (word.length > 2) {
            if (titleLower.includes(word)) {
                score += 2;
            }
            if (snippetLower.includes(word)) {
                score += 1;
            }
        }
    });
    
    return score;
}

/**
 * Filter out low-quality results
 */
export function filterLowQualityResults(results: SearchResult[], query: string): SearchResult[] {
    return results.filter(result => {
        // Remove mock results
        if (isMockResult(result, query)) {
            return false;
        }
        
        // Remove results with negative quality scores
        const qualityScore = calculateQualityScore(result, query);
        return qualityScore >= 0;
    });
}

/**
 * Simple relevance scoring based on query keywords
 * In production, you'd use a proper ML model or embedding similarity
 */
function calculateRelevanceScore(result: SearchResult, query: string): number {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    let score = 0;
    const titleLower = result.title.toLowerCase();
    const snippetLower = result.snippet.toLowerCase();
    
    // Title matches are more important
    queryWords.forEach(word => {
        if (word.length > 2) {
            if (titleLower.includes(word)) {
                score += 3;
            }
            if (snippetLower.includes(word)) {
                score += 1;
            }
        }
    });

    // Boost for certain domains (trusted sources)
    if (TRUSTED_DOMAINS.some(domain => result.domain.includes(domain))) {
        score += 2;
    }

    return score;
}

/**
 * Extract evidence snippet from result
 * In production, you'd fetch the page and extract relevant paragraphs
 */
function extractEvidence(result: SearchResult, query: string): string {
    // For now, use the snippet as evidence
    // In Phase 3+, we'd fetch the page and extract relevant paragraphs
    const queryWords = query.toLowerCase().split(/\s+/);
    const snippet = result.snippet;
    
    // Try to find the most relevant sentence
    const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
        const sentenceLower = sentence.toLowerCase();
        const matchCount = queryWords.filter(word => sentenceLower.includes(word)).length;
        if (matchCount >= queryWords.length / 2) {
            return sentence.trim();
        }
    }
    
    return snippet.substring(0, 200); // Fallback to first 200 chars
}

/**
 * Re-rank search results by relevance and quality
 */
export function rerankResults(results: SearchResult[], query: string): SearchResult[] {
    // First, filter out low-quality results
    const filtered = filterLowQualityResults(results, query);
    
    // Then calculate quality and relevance scores
    const scored = filtered.map(result => {
        const qualityScore = calculateQualityScore(result, query);
        const relevanceScore = calculateRelevanceScore(result, query);
        const combinedScore = qualityScore * 0.6 + relevanceScore * 0.4; // Weight quality more
        
        return {
            ...result,
            relevanceScore,
            qualityScore,
            combinedScore,
            evidence: extractEvidence(result, query),
        };
    });
    
    // Sort by combined score (quality + relevance)
    const sorted = scored.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));
    
    // Return top 7 results (increased from 5 for better coverage)
    // Remove temporary scoring fields before returning
    return sorted.slice(0, 7).map(result => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { qualityScore, combinedScore, ...cleanResult } = result;
        return cleanResult;
    });
}

/**
 * Validate search results quality
 */
export function validateResults(results: SearchResult[]): {
    isValid: boolean;
    issues: string[];
} {
    const issues: string[] = [];

    if (results.length === 0) {
        issues.push('No search results found');
    }

    if (results.length < 3) {
        issues.push('Insufficient search results for reliable answer');
    }

    // Check for low-quality results (very short snippets)
    const lowQualityCount = results.filter(r => r.snippet.length < 50).length;
    if (lowQualityCount > results.length / 2) {
        issues.push('Many results have low-quality snippets');
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
}

