import type { SearchResult } from '../types.js';

export interface QualityCheckResult {
    isValid: boolean;
    score: number; // 0-100
    issues: string[];
    citationCoverage: number; // Percentage of sources cited
    citationValidity: number; // Percentage of citations that match valid sources
}

/**
 * Extract citation numbers from text (e.g., [1], [2], [1][2])
 */
function extractCitations(text: string): number[] {
    const citationRegex = /\[(\d+)\]/g;
    const citations: number[] = [];
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (!citations.includes(num)) {
            citations.push(num);
        }
    }

    return citations.sort((a, b) => a - b);
}

/**
 * Validate that citations match available sources
 */
function validateCitations(citations: number[], sourceCount: number): {
    valid: number[];
    invalid: number[];
} {
    const valid: number[] = [];
    const invalid: number[] = [];

    citations.forEach(citation => {
        // Citations are 1-indexed, sources are 0-indexed
        if (citation >= 1 && citation <= sourceCount) {
            valid.push(citation);
        } else {
            invalid.push(citation);
        }
    });

    return { valid, invalid };
}

/**
 * Calculate citation coverage - how many sources were actually cited
 */
function calculateCitationCoverage(citations: number[], sourceCount: number): number {
    if (sourceCount === 0) return 0;

    const uniqueCitations = [...new Set(citations)];
    const validCitations = uniqueCitations.filter(c => c >= 1 && c <= sourceCount);
    
    return Math.round((validCitations.length / sourceCount) * 100);
}

/**
 * Check response quality based on citations and sources
 */
export function checkResponseQuality(
    responseText: string,
    sources: SearchResult[]
): QualityCheckResult {
    const issues: string[] = [];
    let score = 100;

    const sourceCount = sources.length;
    const citations = extractCitations(responseText);

    // Check if response has citations when sources are available
    if (sourceCount > 0 && citations.length === 0) {
        issues.push('Response lacks citations despite having search sources');
        score -= 40;
    }

    // Validate citation numbers
    const { valid, invalid } = validateCitations(citations, sourceCount);
    
    if (invalid.length > 0) {
        issues.push(`Invalid citation numbers: [${invalid.join('], [')}] (only ${sourceCount} sources available)`);
        score -= 20;
    }

    // Check citation coverage
    const coverage = calculateCitationCoverage(citations, sourceCount);
    const citationValidity = citations.length > 0 
        ? Math.round((valid.length / citations.length) * 100)
        : 0;

    if (sourceCount > 0 && coverage < 50) {
        issues.push(`Low citation coverage: only ${coverage}% of sources were cited`);
        score -= 15;
    }

    if (citationValidity < 100 && citations.length > 0) {
        issues.push(`Some citations are invalid: ${citationValidity}% validity`);
        score -= 10;
    }

    // Check if response is too short (potential hallucination indicator)
    if (responseText.length < 100 && sourceCount > 0) {
        issues.push('Response is unusually short given available sources');
        score -= 10;
    }

    // Check if response is too long without citations (potential hallucination)
    if (responseText.length > 1000 && citations.length === 0 && sourceCount > 0) {
        issues.push('Long response without citations - may contain unsourced information');
        score -= 20;
    }

    score = Math.max(0, score);

    return {
        isValid: issues.length === 0 && score >= 70,
        score,
        issues,
        citationCoverage: coverage,
        citationValidity,
    };
}

