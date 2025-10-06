import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisClient } from './redis-client';
import { CachePatterns } from './cache-patterns';

export interface CacheManagerConfig {
    enableMetrics?: boolean;
    metricsInterval?: number;
    enableWarmup?: boolean;
    warmupInterval?: number;
    enableInvalidation?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    healthCheckInterval?: number;
}

export interface InvalidationListener {
    (key: string, reason: string): Promise<void>;
}

@Injectable()
export class CacheManager implements OnModuleDestroy {
    private readonly logger = new Logger(CacheManager.name);
    private readonly patterns: CachePatterns;
    private readonly warmer: CacheWarmer;
    private readonly invalidator: CacheInvalidator;
    private metricsInterval?: NodeJS.Timeout;
    private warmupInterval?: NodeJS.Timeout;
    private healthCheckInterval?: NodeJS.Timeout;

    constructor(
        private readonly client: RedisClient,
        private readonly config: CacheManagerConfig = {},
    ) {
        this.patterns = new CachePatterns(client);
        this.warmer = new CacheWarmer(client);
        this.invalidator = new CacheInvalidator(client, this.patterns);

        this.initializeBackgroundProcesses();
        this.logger.log('Cache manager initialized');
    }

    private initializeBackgroundProcesses(): void {
        if (this.config.enableMetrics !== false) {
            this.startMetricsCollection();
        }

        if (this.config.enableWarmup !== false) {
            this.startCacheWarmup();
        }

        this.startHealthCheck();
    }

    getClient(): RedisClient {
        return this.client;
    }

    getPatterns(): CachePatterns {
        return this.patterns;
    }

    getWarmer(): CacheWarmer {
        return this.warmer;
    }

    getInvalidator(): CacheInvalidator {
        return this.invalidator;
    }

    async withRetry<T>(operation: () => Promise<T>): Promise<T> {
        const maxRetries = this.config.maxRetries || 3;
        const retryDelay = this.config.retryDelay || 100;
        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                await this.sleep(retryDelay * attempt);
            }

            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                this.logger.warn(
                    `Cache operation failed (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}`,
                );
            }
        }

        throw lastError!;
    }

    async getWithFallback<T>(
        key: string,
        ttlSeconds: number,
        fallback: () => Promise<T>,
    ): Promise<T> {
        try {
            const cached = await this.client.getJSON<T>(key);
            if (cached !== null) {
                return cached;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Cache error for key ${key}: ${errorMessage}`);
        }

        // Cache miss or error, use fallback
        const data = await fallback();

        // Store in cache for next time (fire and forget)
        this.client.set(key, data, ttlSeconds).catch((error) => {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Failed to cache data for key ${key}: ${errorMessage}`);
        });

        return data;
    }

    async setWithTags(
        key: string,
        value: any,
        ttlSeconds: number,
        tags: string[] = [],
    ): Promise<void> {
        // Set the main value
        await this.client.set(key, value, ttlSeconds);

        // Associate with tags for group invalidation
        for (const tag of tags) {
            const tagKey = `tag:${tag}`;
            await this.client.addToSet(tagKey, key);
            // Set TTL for tag set (slightly longer than data TTL)
            await this.client.expire(tagKey, ttlSeconds + 3600);
        }
    }

    async invalidateByTag(tag: string): Promise<number> {
        const tagKey = `tag:${tag}`;

        // Get all keys associated with this tag
        const keys = await this.client.getSetMembers(tagKey);
        if (keys.length === 0) {
            return 0;
        }

        // Delete all associated keys
        const deletedCount = await this.client.delete(...keys);

        // Delete the tag set itself
        await this.client.delete(tagKey);

        this.logger.log(`Invalidated ${deletedCount} keys for tag ${tag}`);
        return deletedCount;
    }

    registerInvalidationListener(pattern: string, listener: InvalidationListener): void {
        this.invalidator.registerListener(pattern, listener);
    }

    async notifyInvalidation(key: string, reason: string): Promise<void> {
        await this.invalidator.notifyListeners(key, reason);
    }

    getStats(): Record<string, any> {
        const metrics = this.client.getMetrics();
        const circuitBreaker = this.client.getCircuitBreakerState();

        return {
            hits: metrics.hits,
            misses: metrics.misses,
            sets: metrics.sets,
            deletes: metrics.deletes,
            errors: metrics.errors,
            totalOps: metrics.totalOps,
            hitRatio: this.client.getHitRatio(),
            avgLatency: metrics.avgLatency,
            circuitBreakerState: circuitBreaker.state,
            circuitBreakerFailures: circuitBreaker.failures,
        };
    }

    private startMetricsCollection(): void {
        const interval = this.config.metricsInterval || 60000; // 1 minute

        this.metricsInterval = setInterval(() => {
            const stats = this.getStats();
            this.logger.log(`Cache metrics: ${JSON.stringify(stats)}`);

            // Store metrics in cache for monitoring
            const metricsKey = `metrics:cache:${Math.floor(Date.now() / 1000)}`;
            this.client.set(metricsKey, stats, CachePatterns.TTL.METRICS).catch((error) => {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to store cache metrics: ${errorMessage}`);
            });
        }, interval);
    }

    private startCacheWarmup(): void {
        const interval = this.config.warmupInterval || 300000; // 5 minutes

        this.warmupInterval = setInterval(async () => {
            try {
                // Example warmup data - in practice, this would be loaded from database
                const warmupData = {
                    [CachePatterns.FEATURE_FLAGS_KEY]: {
                        newAlgorithm: true,
                        betaFeatures: false,
                    },
                    'config:global': {
                        maxSessionTime: 3600,
                        defaultDifficulty: 0.5,
                    },
                };

                await this.warmer.warmCache(warmupData, CachePatterns.TTL.FEATURE_FLAGS);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Cache warmup failed: ${errorMessage}`);
            }
        }, interval);
    }

    private startHealthCheck(): void {
        const interval = this.config.healthCheckInterval || 30000; // 30 seconds

        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.client.health();
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.logger.error(`Cache health check failed: ${errorMessage}`);
            }
        }, interval);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async onModuleDestroy(): Promise<void> {
        this.logger.log('Shutting down cache manager...');

        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }

        if (this.warmupInterval) {
            clearInterval(this.warmupInterval);
        }

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        await this.client.close();
    }
}

class CacheWarmer {
    private readonly logger = new Logger(CacheWarmer.name);

    constructor(private readonly _client: RedisClient) { }

    async warmCache(warmupData: Record<string, any>, ttlSeconds: number): Promise<void> {
        this.logger.log(`Starting cache warmup with ${Object.keys(warmupData).length} items`);

        try {
            await this._client.setMultiple(warmupData, ttlSeconds);
            this.logger.log('Cache warmup completed successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Cache warmup failed: ${errorMessage}`);
            throw error;
        }
    }
}

class CacheInvalidator {
    private readonly logger = new Logger(CacheInvalidator.name);
    private readonly listeners = new Map<string, InvalidationListener[]>();

    constructor(
        private readonly client: RedisClient,
        private readonly _patterns: CachePatterns,
    ) { }

    registerListener(pattern: string, listener: InvalidationListener): void {
        if (!this.listeners.has(pattern)) {
            this.listeners.set(pattern, []);
        }
        this.listeners.get(pattern)!.push(listener);
    }

    async notifyListeners(key: string, reason: string): Promise<void> {
        for (const [pattern, listeners] of this.listeners.entries()) {
            if (this.matchesPattern(key, pattern)) {
                for (const listener of listeners) {
                    try {
                        await listener(key, reason);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        this.logger.error(
                            `Invalidation listener error for key ${key}: ${errorMessage}`,
                        );
                    }
                }
            }
        }
    }

    private matchesPattern(key: string, pattern: string): boolean {
        if (pattern === '*') {
            return true;
        }

        if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            return key.startsWith(prefix);
        }

        return key === pattern;
    }
}

// Decorator for caching method results
export function Cacheable(
    keyGenerator: (...args: any[]) => string,
    ttlSeconds: number = CachePatterns.TTL.USER_DATA,
) {
    return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const cacheManager: CacheManager = (this as any).cacheManager;
            if (!cacheManager) {
                return method.apply(this, args);
            }

            const key = keyGenerator(...args);

            return cacheManager.getWithFallback(
                key,
                ttlSeconds,
                () => method.apply(this, args),
            );
        };

        return descriptor;
    };
}

// Decorator for cache invalidation
export function CacheEvict(
    keyGenerator: (...args: any[]) => string | string[],
) {
    return function (_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const result = await method.apply(this, args);

            const cacheManager: CacheManager = (this as any).cacheManager;
            if (cacheManager) {
                const keys = keyGenerator(...args);
                const keysArray = Array.isArray(keys) ? keys : [keys];

                for (const key of keysArray) {
                    await cacheManager.getClient().delete(key);
                }
            }

            return result;
        };

        return descriptor;
    };
}