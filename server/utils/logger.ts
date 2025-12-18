import type { TelemetryEvent } from '../types.js';

/**
 * Simple logger for telemetry and debugging
 */
class Logger {
    private events: TelemetryEvent[] = [];
    private maxEvents = 1000; // Keep last 1000 events in memory

    log(event: Omit<TelemetryEvent, 'timestamp'>) {
        const fullEvent: TelemetryEvent = {
            ...event,
            timestamp: Date.now(),
        };

        this.events.push(fullEvent);
        
        // Keep only last maxEvents
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        // Console log for development
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[${fullEvent.type}]`, {
                query: fullEvent.query,
                duration: fullEvent.duration ? `${fullEvent.duration}ms` : undefined,
                error: fullEvent.error,
                ...fullEvent.metadata,
            });
        }
    }

    getEvents(type?: TelemetryEvent['type']) {
        if (type) {
            return this.events.filter(e => e.type === type);
        }
        return [...this.events];
    }

    getStats() {
        const stats = {
            total: this.events.length,
            byType: {} as Record<string, number>,
            avgDuration: {} as Record<string, number>,
            errors: 0,
        };

        const durations: Record<string, number[]> = {};

        this.events.forEach(event => {
            stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
            
            if (event.duration) {
                if (!durations[event.type]) {
                    durations[event.type] = [];
                }
                durations[event.type].push(event.duration);
            }

            if (event.error) {
                stats.errors++;
            }
        });

        // Calculate average durations
        Object.keys(durations).forEach(type => {
            const avg = durations[type].reduce((a, b) => a + b, 0) / durations[type].length;
            stats.avgDuration[type] = Math.round(avg);
        });

        return stats;
    }
}

export const logger = new Logger();

