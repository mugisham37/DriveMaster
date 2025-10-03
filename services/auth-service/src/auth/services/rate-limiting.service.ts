import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    blockDurationMs?: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remainingRequests: number;
    resetTime: number;
    blocked: boolean;
    blockExpiresAt?: number;
}

@Injectable()
export class RateLimitingService {
    private readonly logger = new Logger(RateLimitingService.name);

    // Default rate limit configurations
    private readonly defaultConfigs: Record<string, RateLimitConfig> = {
        login: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 5,
            blockDurationMs: 30 * 60 * 1000, // 30 minutes
        },
        register: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 3,
            blockDurationMs: 60 * 60 * 1000, // 1 hour
        },
        'password-reset': {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 3,
            blockDurationMs: 60 * 60 * 1000, // 1 hour
        },
        'mfa-verify': {
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 5,
            blockDurationMs: 15 * 60 * 1000, // 15 minutes
        },
        global: {
            windowMs: 60 * 1000, // 1 minute
            maxRequests: 100,
            blockDurationMs: 5 * 60 * 1000, // 5 minutes
        },
    };

    constructor(
        @InjectRedis() private readonly redis: Redis,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Check rate limit for IP address and endpoint
     */
    async checkRateLimit(
        ipAddress: string,
        endpoint: string,
        userId?: string,
    ): Promise<RateLimitResult> {
        const config = this.getConfig(endpoint);
        const now = Date.now();

        // Check if IP is currently blocked
        const blockKey = `rate_limit:block:${ipAddress}:${endpoint}`;
        const blockExpiry = await this.redis.get(blockKey);

        if (blockExpiry && parseInt(blockExpiry) > now) {
            return {
                allowed: false,
                remainingRequests: 0,
                resetTime: parseInt(blockExpiry),
                blocked: true,
                blockExpiresAt: parseInt(blockExpiry),
            };
        }

        // Check rate limit
        const key = `rate_limit:${ipAddress}:${endpoint}`;
        const userKey = userId ? `rate_limit:user:${userId}:${endpoint}` : null;

        const [ipCount, userCount] = await Promise.all([
            this.incrementCounter(key, config.windowMs),
            userKey ? this.incrementCounter(userKey, config.windowMs) : Promise.resolve(0),
        ]);

        const maxCount = Math.max(ipCount, userCount);
        const remainingRequests = Math.max(0, config.maxRequests - maxCount);

        if (maxCount > config.maxRequests) {
            // Block the IP address
            if (config.blockDurationMs) {
                const blockExpiresAt = now + config.blockDurationMs;
                await this.redis.setex(blockKey, Math.ceil(config.blockDurationMs / 1000), blockExpiresAt.toString());

                this.logger.warn(`Rate limit exceeded for IP ${ipAddress} on ${endpoint}. Blocked until ${new Date(blockExpiresAt)}`);

                return {
                    allowed: false,
                    remainingRequests: 0,
                    resetTime: blockExpiresAt,
                    blocked: true,
                    blockExpiresAt,
                };
            }

            return {
                allowed: false,
                remainingRequests: 0,
                resetTime: now + config.windowMs,
                blocked: false,
            };
        }

        return {
            allowed: true,
            remainingRequests,
            resetTime: now + config.windowMs,
            blocked: false,
        };
    }

    /**
     * Record suspicious activity
     */
    async recordSuspiciousActivity(
        ipAddress: string,
        userId: string | null,
        activity: string,
        metadata: Record<string, any> = {},
    ): Promise<void> {
        const suspiciousKey = `suspicious:${ipAddress}`;
        const now = Date.now();

        const activityRecord = {
            timestamp: now,
            userId,
            activity,
            metadata,
        };

        // Store suspicious activity (expire after 24 hours)
        await this.redis.lpush(suspiciousKey, JSON.stringify(activityRecord));
        await this.redis.expire(suspiciousKey, 24 * 60 * 60);

        // Check if this IP has too many suspicious activities
        const recentActivities = await this.redis.lrange(suspiciousKey, 0, 9); // Last 10 activities

        if (recentActivities.length >= 5) {
            // Block IP for suspicious activity
            const blockKey = `suspicious:block:${ipAddress}`;
            const blockDuration = 60 * 60 * 1000; // 1 hour
            const blockExpiresAt = now + blockDuration;

            await this.redis.setex(blockKey, Math.ceil(blockDuration / 1000), blockExpiresAt.toString());

            this.logger.warn(`IP ${ipAddress} blocked for suspicious activity: ${activity}`, {
                userId,
                metadata,
                recentActivitiesCount: recentActivities.length,
            });
        }
    }

    /**
     * Check if IP is blocked for suspicious activity
     */
    async isSuspiciouslyBlocked(ipAddress: string): Promise<boolean> {
        const blockKey = `suspicious:block:${ipAddress}`;
        const blockExpiry = await this.redis.get(blockKey);

        return blockExpiry && parseInt(blockExpiry) > Date.now();
    }

    /**
     * Get suspicious activities for an IP
     */
    async getSuspiciousActivities(ipAddress: string): Promise<any[]> {
        const suspiciousKey = `suspicious:${ipAddress}`;
        const activities = await this.redis.lrange(suspiciousKey, 0, -1);

        return activities.map(activity => JSON.parse(activity));
    }

    /**
     * Clear rate limit for IP and endpoint (admin function)
     */
    async clearRateLimit(ipAddress: string, endpoint: string): Promise<void> {
        const keys = [
            `rate_limit:${ipAddress}:${endpoint}`,
            `rate_limit:block:${ipAddress}:${endpoint}`,
            `suspicious:block:${ipAddress}`,
        ];

        await this.redis.del(...keys);
        this.logger.log(`Cleared rate limits for IP ${ipAddress} on ${endpoint}`);
    }

    /**
     * Increment counter with sliding window
     */
    private async incrementCounter(key: string, windowMs: number): Promise<number> {
        const now = Date.now();
        const windowStart = now - windowMs;

        // Use Redis sorted set for sliding window
        const pipeline = this.redis.pipeline();

        // Remove old entries
        pipeline.zremrangebyscore(key, 0, windowStart);

        // Add current request
        pipeline.zadd(key, now, `${now}-${Math.random()}`);

        // Count current requests
        pipeline.zcard(key);

        // Set expiration
        pipeline.expire(key, Math.ceil(windowMs / 1000));

        const results = await pipeline.exec();

        // Return the count (third operation result)
        return results?.[2]?.[1] as number || 0;
    }

    /**
     * Get rate limit configuration for endpoint
     */
    private getConfig(endpoint: string): RateLimitConfig {
        const configKey = `RATE_LIMIT_${endpoint.toUpperCase().replace('-', '_')}`;
        const customConfig = this.configService.get(configKey);

        if (customConfig) {
            return JSON.parse(customConfig);
        }

        return this.defaultConfigs[endpoint] || this.defaultConfigs.global;
    }
}