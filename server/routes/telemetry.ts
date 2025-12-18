import { Router } from 'express';
import { logger } from '../utils/logger.js';
import type { TelemetryEvent } from '../types.js';

const router = Router();

/**
 * POST /api/telemetry
 * Receive telemetry events from frontend
 */
router.post('/telemetry', async (req, res) => {
    try {
        const event = req.body as Omit<TelemetryEvent, 'timestamp'>;
        
        // Validate event structure
        if (!event.type) {
            return res.status(400).json({ error: 'Event type is required' });
        }

        logger.log(event);
        res.json({ success: true });
    } catch (error) {
        console.error('Telemetry error:', error);
        res.status(500).json({ error: 'Failed to log telemetry' });
    }
});

/**
 * GET /api/telemetry/stats
 * Get telemetry statistics
 */
router.get('/telemetry/stats', (req, res) => {
    try {
        const stats = logger.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;

