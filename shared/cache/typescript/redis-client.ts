import Redis, { Cluster, RedisOptions, ClusterOptions } from 'ioredis';
import { Logger } from '@nestjs/common';

export interface RedisConfig {
    addresses: string[];
    password?: string;
    db?: number;
    poolSize?: number;
    minIdleConns?: number;
    maxRetries?: number;
    dialTimeout?: number;
    readTimeout?: number;
    writeTimeout?: number;
    poolTimeout?: number;
    idleTimeout?: number;
    clusterMode?: boolean;
    keyPrefix?: string;
}

export interface CacheMetrics {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
    totalOps: number;
    avgLatency: number;
}

export interface CircuitBreakerState {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailureTime: Date | null;
    failureThreshold: number;
    resetTimeout: number;
}

export class RedisClient {
    private client!: Redis | Cluster;
    private readonly logger = new Logger(RedisClient.name);
    private metrics: CacheMetrics = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        totalOps: 0,
        avgLatency: 0,
    };
    private circuitBreaker: CircuitBreakerState = {
        state: 'closed',
        failures: 0,
        lastFailureTime: null,
        failureThreshold: 5,
        resetTimeout: 30000, // 30 seconds
    };

    constructor(private config: RedisConfig) {
        this.initializeClient();
    }

    private initializeClient(): void {
        try {
            if (this.config.clusterMode) {
                const clusterOptions: ClusterOptions = {
                    redisOptions: {
                        password: this.config.password,
                        connectTimeout: this.config.dialTimeout || 5000,
                        commandTimeout: this.config.readTimeout || 3000,
                        maxRetriesPerRequest: this.config.maxRetries || 3,
                        keyPrefix: this.config.keyPrefix,
                    },
                    enableOfflineQueue: false,
                };

                this.client = new Cluster(this.config.addresses, clusterOptions);
            } else {
                const redisOptions: RedisOptions = {
                    host: this.config.addresses[0].split(':')[0],
                    port: parseInt(this.config.addresses[0].split(':')[1]) || 6379,
                    password: this.config.password,
                    db: this.config.db || 0,
                    connectTimeout: this.config.dialTimeout || 5000,
                    commandTimeout: this.config.readTimeout || 3000,
                    maxRetriesPerRequest: this.config.maxRetries || 3,
                    keyPrefix: this.config.keyPrefix,
                };

                this.client = new Redis(redisOptions);
            }

            this.setupEventHandlers();
            this.logger.log(`Redis client initialized (cluster: ${this.config.clusterMode})`);
        } catch (error) {
            this.logger.error('Failed to initialize Redis client', error);
            throw error;
        }
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            this.logger.log('Redis connected');
        });

        this.client.on('ready', () => {
            this.logger.log('Redis ready');
        });

        this.client.on('error', (error: Error) => {
            this.logger.error('Redis error', error);
            this.metrics.errors++;
        });

        this.client.on('close', () => {
            this.logger.warn('Redis connection closed');
        });

        this.client.on('reconnecting', () => {
            this.logger.log('Redis reconnecting');
        });
    }

    private async executeWithCircuitBreaker<T>(
        operation: () => Promise<T>,
    ): Promise<T> {
        const start = Date.now();

        try {
            // Check circuit breaker state
            if (this.circuitBreaker.state === 'open') {
                const timeSinceLastFailure = Date.now() - (this.circuitBreaker.lastFailureTime?.getTime() || 0);
                if (timeSinceLastFailure > this.circuitBreaker.resetTimeout) {
                    this.circuitBreaker.state = 'half-open';
                } else {
                    this.metrics.errors++;
                    throw new Error('Circuit breaker is open');
                }
            }

            const result = await operation();

            // Reset circuit breaker on success
            if (this.circuitBreaker.state === 'half-open') {
                this.circuitBreaker.state = 'closed';
                this.circuitBreaker.failures = 0;
            }

            return result;
        } catch (error) {
            this.metrics.errors++;
            this.circuitBreaker.failures++;
            this.circuitBreaker.lastFailureTime = new Date();

            if (this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
                this.circuitBreaker.state = 'open';
            }

            throw error;
        } finally {
            this.metrics.totalOps++;
            const latency = Date.now() - start;
            this.metrics.avgLatency =
                (this.metrics.avgLatency * (this.metrics.totalOps - 1) + latency) / this.metrics.totalOps;
        }
    }

    async get(key: string): Promise<string | null> {
        return this.executeWithCircuitBreaker(async () => {
            const result = await this.client.get(key);
            if (result === null) {
                this.metrics.misses++;
            } else {
                this.metrics.hits++;
            }
            return result;
        });
    }

    async getJSON<T>(key: string): Promise<T | null> {
        const data = await this.get(key);
        if (data === null) {
            return null;
        }

        try {
            return JSON.parse(data);
        } catch (error) {
            this.logger.error(`Failed to parse JSON for key ${key}`, error);
            throw new Error(`Invalid JSON data for key ${key}`);
        }
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
        return this.executeWithCircuitBreaker(async () => {
            const data = typeof value === 'string' ? value : JSON.stringify(value);

            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, data);
            } else {
                await this.client.set(key, data);
            }

            this.metrics.sets++;
        });
    }

    async setNX(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
        return this.executeWithCircuitBreaker(async () => {
            const data = typeof value === 'string' ? value : JSON.stringify(value);

            let result: number | string | null;
            if (ttlSeconds) {
                result = await this.client.set(key, data, 'EX', ttlSeconds, 'NX');
            } else {
                result = await this.client.setnx(key, data);
            }

            const success = result === 1 || result === 'OK';
            if (success) {
                this.metrics.sets++;
            }

            return success;
        });
    }

    async delete(...keys: string[]): Promise<number> {
        if (keys.length === 0) {
            return 0;
        }

        return this.executeWithCircuitBreaker(async () => {
            const result = await this.client.del(...keys);
            this.metrics.deletes += result;
            return result;
        });
    }

    async exists(...keys: string[]): Promise<number> {
        if (keys.length === 0) {
            return 0;
        }

        return this.executeWithCircuitBreaker(async () => {
            return await this.client.exists(...keys);
        });
    }

    async expire(key: string, ttlSeconds: number): Promise<boolean> {
        return this.executeWithCircuitBreaker(async () => {
            const result = await this.client.expire(key, ttlSeconds);
            return result === 1;
        });
    }

    async ttl(key: string): Promise<number> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.ttl(key);
        });
    }

    async increment(key: string): Promise<number> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.incr(key);
        });
    }

    async incrementBy(key: string, value: number): Promise<number> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.incrby(key, value);
        });
    }

    async getMultiple(keys: string[]): Promise<Record<string, string | null>> {
        if (keys.length === 0) {
            return {};
        }

        return this.executeWithCircuitBreaker(async () => {
            const values = await this.client.mget(...keys);
            const result: Record<string, string | null> = {};

            let hits = 0;
            let misses = 0;

            for (let i = 0; i < keys.length; i++) {
                result[keys[i]] = values[i];
                if (values[i] === null) {
                    misses++;
                } else {
                    hits++;
                }
            }

            this.metrics.hits += hits;
            this.metrics.misses += misses;

            return result;
        });
    }

    async setMultiple(pairs: Record<string, any>, ttlSeconds?: number): Promise<void> {
        if (Object.keys(pairs).length === 0) {
            return;
        }

        return this.executeWithCircuitBreaker(async () => {
            const pipeline = this.client.pipeline();

            for (const [key, value] of Object.entries(pairs)) {
                const data = typeof value === 'string' ? value : JSON.stringify(value);

                if (ttlSeconds) {
                    pipeline.setex(key, ttlSeconds, data);
                } else {
                    pipeline.set(key, data);
                }
            }

            await pipeline.exec();
            this.metrics.sets += Object.keys(pairs).length;
        });
    }

    async invalidatePattern(pattern: string): Promise<number> {
        return this.executeWithCircuitBreaker(async () => {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0) {
                return 0;
            }

            const result = await this.client.del(...keys);
            this.metrics.deletes += result;
            return result;
        });
    }

    async health(): Promise<string> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.ping();
        });
    }

    getMetrics(): CacheMetrics {
        return { ...this.metrics };
    }

    getHitRatio(): number {
        const total = this.metrics.hits + this.metrics.misses;
        return total === 0 ? 0 : this.metrics.hits / total;
    }

    getCircuitBreakerState(): CircuitBreakerState {
        return { ...this.circuitBreaker };
    }

    async close(): Promise<void> {
        await this.client.quit();
        this.logger.log('Redis client closed');
    }

    // Advanced operations
    async addToSet(key: string, ...members: string[]): Promise<number> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.sadd(key, ...members);
        });
    }

    async getSetMembers(key: string): Promise<string[]> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.smembers(key);
        });
    }

    async removeFromSet(key: string, ...members: string[]): Promise<number> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.srem(key, ...members);
        });
    }

    async addToSortedSet(key: string, score: number, member: string): Promise<number> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.zadd(key, score, member);
        });
    }

    async getSortedSetRange(key: string, start: number, stop: number): Promise<string[]> {
        return this.executeWithCircuitBreaker(async () => {
            return await this.client.zrange(key, start, stop);
        });
    }

    async getSortedSetRangeWithScores(
        key: string,
        start: number,
        stop: number
    ): Promise<Array<{ member: string; score: number }>> {
        return this.executeWithCircuitBreaker(async () => {
            const result = await this.client.zrange(key, start, stop, 'WITHSCORES');
            const pairs: Array<{ member: string; score: number }> = [];

            for (let i = 0; i < result.length; i += 2) {
                pairs.push({
                    member: result[i],
                    score: parseFloat(result[i + 1]),
                });
            }

            return pairs;
        });
    }

    async publishMessage(channel: string, message: any): Promise<number> {
        return this.executeWithCircuitBreaker(async () => {
            const data = typeof message === 'string' ? message : JSON.stringify(message);
            return await this.client.publish(channel, data);
        });
    }

    subscribeToChannel(channel: string, callback: (message: any) => void): void {
        const subscriber = this.client.duplicate();

        subscriber.subscribe(channel).then(() => {
            this.logger.log(`Subscribed to channel ${channel}`);
        }).catch((err: Error) => {
            this.logger.error(`Failed to subscribe to channel ${channel}`, err);
        });

        subscriber.on('message', (receivedChannel: string, message: string) => {
            if (receivedChannel === channel) {
                try {
                    const parsedMessage = JSON.parse(message);
                    callback(parsedMessage);
                } catch {
                    callback(message);
                }
            }
        });
    }
}