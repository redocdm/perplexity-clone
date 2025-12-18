import type { SearchResult } from '../types.js';

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
        if (titleLower.includes(word)) {
            score += 3;
        }
        if (snippetLower.includes(word)) {
            score += 1;
        }
    });

    // Boost for certain domains (trusted sources)
    const trustedDomains = ['wikipedia.org', 'edu', 'gov', 'nature.com', 'stackoverflow.com'];
    if (trustedDomains.some(domain => result.domain.includes(domain))) {
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
 * Re-rank search results by relevance
 */
export function rerankResults(results: SearchResult[], query: string): SearchResult[] {
    return results
        .map(result => ({
            ...result,
            relevanceScore: calculateRelevanceScore(result, query),
            evidence: extractEvidence(result, query),
        }))
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, 5); // Return top 5
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

