import { Router } from 'express';
import { performSearch } from '../services/searchService.js';
import { rerankResults, validateResults } from '../services/retrievalService.js';
import { logger } from '../utils/logger.js';
import type { SearchResponse } from '../types.js';

const router = Router();

/**
 * POST /api/search
 * Search endpoint with retrieval and re-ranking
 */
router.post('/search', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const trimmedQuery = query.trim();

        // Perform search
        const searchResponse: SearchResponse = await performSearch(trimmedQuery);

        // Re-rank results for better relevance
        const rerankedResults = rerankResults(searchResponse.results, trimmedQuery);
        searchResponse.results = rerankedResults;

        // Validate results quality
        const validation = validateResults(searchResponse.results);
        if (!validation.isValid) {
            // Log quality issues but still return results
            logger.log({
                type: 'search_succeeded',
                query: trimmedQuery,
                metadata: {
                    qualityIssues: validation.issues,
                    resultCount: searchResponse.results.length,
                },
            });
        }

        res.json(searchResponse);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;

