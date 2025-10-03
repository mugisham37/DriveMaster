import { RedisClient } from './redis-client';

export class CachePatterns {
    constructor(private client: RedisClient) { }

    // Key pattern constants
    static readonly USER_KEY = 'user:{userId}';
    static readonly USER_PREFERENCES_KEY = 'user:preferences:{userId}';
    static readonly USER_SESSION_KEY = 'user:session:{sessionId}';
    static readonly USER_ACTIVITY_KEY = 'user:activity:{userId}:{date}';

    static readonly SCHEDULER_STATE_KEY = 'scheduler:{userId}';
    static readonly SCHEDULER_HOT_KEY = 'scheduler:hot:{userId}';
    static readonly SM2_STATE_KEY = 'sm2:{userId}:{itemId}';
    static readonly BKT_STATE_KEY = 'bkt:{userId}:{topic}';
    static readonly IRT_ABILITY_KEY = 'irt:ability:{userId}';

    static readonly ITEM_KEY = 'item:{itemId}';
    static readonly ITEMS_BY_JURISDICTION_KEY = 'items:jurisdiction:{countryCode}';
    static readonly ITEMS_BY_TOPIC_KEY = 'items:topic:{topic}';
    static readonly ITEM_DIFFICULTY_KEY = 'item:difficulty:{itemId}';

    static readonly PREDICTION_KEY = 'prediction:{userId}:{itemId}';
    static readonly PREDICTION_BATCH_KEY = 'prediction:batch:{userId}:{hash}';
    static readonly MODEL_VERSION_KEY = 'ml:model:version';

    static readonly SESSION_KEY = 'session:{sessionId}';
    static readonly RATE_LIMIT_USER_KEY = 'rate_limit:user:{userId}:{endpoint}';
    static readonly RATE_LIMIT_IP_KEY = 'rate_limit:ip:{ipAddress}:{endpoint}';

    static readonly FEATURE_FLAGS_KEY = 'feature_flags';
    static readonly FEATURE_FLAGS_USER_KEY = 'feature_flags:user:{userId}';
    static readonly CONFIG_KEY = 'config:{serviceName}';

    static readonly METRICS_KEY = 'metrics:{service}:{metricName}';
    static readonly ANALYTICS_KEY = 'analytics:{userId}:{date}';

    // TTL constants (in seconds)
    static readonly TTL = {
        PREDICTION: 15 * 60, // 15 minutes
        SESSION: 30 * 60, // 30 minutes
        RATE_LIMIT: 60 * 60, // 1 hour
        SCHEDULER_STATE: 30 * 60, // 30 minutes
        SCHEDULER_HOT: 15 * 60, // 15 minutes
        USER_DATA: 60 * 60, // 1 hour
        ITEM_DATA: 4 * 60 * 60, // 4 hours
        CONTENT_LIST: 6 * 60 * 60, // 6 hours
        FEATURE_FLAGS: 5 * 60, // 5 minutes
        CONFIG: 60 * 60, // 1 hour
        ANALYTICS: 24 * 60 * 60, // 24 hours
        METRICS: 60 * 60, // 1 hour
    };

    private buildKey(pattern: string, params: Record<string, string>): string {
        let key = pattern;
        for (const [param, value] of Object.entries(params)) {
            key = key.replace(`{${param}}`, value);
        }
        return key;
    }

    // User operations
    async getUser(userId: string): Promise<any> {
        const key = this.buildKey(CachePatterns.USER_KEY, { userId });
        return await this.client.getJSON(key);
    }

    async setUser(userId: string, user: any): Promise<void> {
        const key = this.buildKey(CachePatterns.USER_KEY, { userId });
        await this.client.set(key, user, CachePatterns.TTL.USER_DATA);
    }

    async getUserPreferences(userId: string): Promise<any> {
        const key = this.buildKey(CachePatterns.USER_PREFERENCES_KEY, { userId });
        return await this.client.getJSON(key);
    }

    async setUserPreferences(userId: string, preferences: any): Promise<void> {
        const key = this.buildKey(CachePatterns.USER_PREFERENCES_KEY, { userId });
        await this.client.set(key, preferences, CachePatterns.TTL.USER_DATA);
    }

    // Scheduler state operations
    async getSchedulerState(userId: string): Promise<any> {
        const key = this.buildKey(CachePatterns.SCHEDULER_STATE_KEY, { userId });
        return await this.client.getJSON(key);
    }

    async setSchedulerState(userId: string, state: any): Promise<void> {
        const key = this.buildKey(CachePatterns.SCHEDULER_STATE_KEY, { userId });
        await this.client.set(key, state, CachePatterns.TTL.SCHEDULER_STATE);
    }

    async getSchedulerHotData(userId: string): Promise<any> {
        const key = this.buildKey(CachePatterns.SCHEDULER_HOT_KEY, { userId });
        return await this.client.getJSON(key);
    }

    async setSchedulerHotData(userId: string, hotData: any): Promise<void> {
        const key = this.buildKey(CachePatterns.SCHEDULER_HOT_KEY, { userId });
        await this.client.set(key, hotData, CachePatterns.TTL.SCHEDULER_HOT);
    }

    // Content operations
    async getItem(itemId: string): Promise<any> {
        const key = this.buildKey(CachePatterns.ITEM_KEY, { itemId });
        return await this.client.getJSON(key);
    }

    async setItem(itemId: string, item: any): Promise<void> {
        const key = this.buildKey(CachePatterns.ITEM_KEY, { itemId });
        await this.client.set(key, item, CachePatterns.TTL.ITEM_DATA);
    }

    async getItemsByJurisdiction(countryCode: string): Promise<string[]> {
        const key = this.buildKey(CachePatterns.ITEMS_BY_JURISDICTION_KEY, { countryCode });
        return await this.client.getJSON(key) || [];
    }

    async setItemsByJurisdiction(countryCode: string, itemIds: string[]): Promise<void> {
        const key = this.buildKey(CachePatterns.ITEMS_BY_JURISDICTION_KEY, { countryCode });
        await this.client.set(key, itemIds, CachePatterns.TTL.CONTENT_LIST);
    }

    async getItemsByTopic(topic: string): Promise<string[]> {
        const key = this.buildKey(CachePatterns.ITEMS_BY_TOPIC_KEY, { topic });
        return await this.client.getJSON(key) || [];
    }

    async setItemsByTopic(topic: string, itemIds: string[]): Promise<void> {
        const key = this.buildKey(CachePatterns.ITEMS_BY_TOPIC_KEY, { topic });
        await this.client.set(key, itemIds, CachePatterns.TTL.CONTENT_LIST);
    }

    // ML prediction operations
    async getPrediction(userId: string, itemId: string): Promise<number | null> {
        const key = this.buildKey(CachePatterns.PREDICTION_KEY, { userId, itemId });
        return await this.client.getJSON(key);
    }

    async setPrediction(userId: string, itemId: string, prediction: number): Promise<void> {
        const key = this.buildKey(CachePatterns.PREDICTION_KEY, { userId, itemId });
        await this.client.set(key, prediction, CachePatterns.TTL.PREDICTION);
    }

    async getBatchPredictions(userId: string, hash: string): Promise<Record<string, number> | null> {
        const key = this.buildKey(CachePatterns.PREDICTION_BATCH_KEY, { userId, hash });
        return await this.client.getJSON(key);
    }

    async setBatchPredictions(userId: string, hash: string, predictions: Record<string, number>): Promise<void> {
        const key = this.buildKey(CachePatterns.PREDICTION_BATCH_KEY, { userId, hash });
        await this.client.set(key, predictions, CachePatterns.TTL.PREDICTION);
    }

    // Session management
    async getSession(sessionId: string): Promise<any> {
        const key = this.buildKey(CachePatterns.SESSION_KEY, { sessionId });
        return await this.client.getJSON(key);
    }

    async setSession(sessionId: string, session: any): Promise<void> {
        const key = this.buildKey(CachePatterns.SESSION_KEY, { sessionId });
        await this.client.set(key, session, CachePatterns.TTL.SESSION);
    }

    async extendSession(sessionId: string): Promise<void> {
        const key = this.buildKey(CachePatterns.SESSION_KEY, { sessionId });
        await this.client.expire(key, CachePatterns.TTL.SESSION);
    }

    // Rate limiting
    async checkRateLimit(userId: string, endpoint: string, limit: number): Promise<boolean> {
        const key = this.buildKey(CachePatterns.RATE_LIMIT_USER_KEY, { userId, endpoint });
        const current = await this.client.increment(key);

        if (current === 1) {
            await this.client.expire(key, CachePatterns.TTL.RATE_LIMIT);
        }

        return current <= limit;
    }

    async checkIPRateLimit(ipAddress: string, endpoint: string, limit: number): Promise<boolean> {
        const key = this.buildKey(CachePatterns.RATE_LIMIT_IP_KEY, { ipAddress, endpoint });
        const current = await this.client.increment(key);

        if (current === 1) {
            await this.client.expire(key, CachePatterns.TTL.RATE_LIMIT);
        }

        return current <= limit;
    }

    // Feature flags
    async getFeatureFlags(): Promise<any> {
        return await this.client.getJSON(CachePatterns.FEATURE_FLAGS_KEY);
    }

    async setFeatureFlags(flags: any): Promise<void> {
        await this.client.set(CachePatterns.FEATURE_FLAGS_KEY, flags, CachePatterns.TTL.FEATURE_FLAGS);
    }

    async getUserFeatureFlags(userId: string): Promise<any> {
        const key = this.buildKey(CachePatterns.FEATURE_FLAGS_USER_KEY, { userId });
        return await this.client.getJSON(key);
    }

    async setUserFeatureFlags(userId: string, flags: any): Promise<void> {
        const key = this.buildKey(CachePatterns.FEATURE_FLAGS_USER_KEY, { userId });
        await this.client.set(key, flags, CachePatterns.TTL.FEATURE_FLAGS);
    }

    // Cache invalidation
    async invalidateUser(userId: string): Promise<void> {
        const patterns = [
            this.buildKey(CachePatterns.USER_KEY, { userId }),
            this.buildKey(CachePatterns.USER_PREFERENCES_KEY, { userId }),
            this.buildKey(CachePatterns.SCHEDULER_STATE_KEY, { userId }),
            this.buildKey(CachePatterns.SCHEDULER_HOT_KEY, { userId }),
            `prediction:${userId}:*`,
            this.buildKey(CachePatterns.FEATURE_FLAGS_USER_KEY, { userId }),
        ];

        for (const pattern of patterns) {
            await this.client.invalidatePattern(pattern);
        }
    }

    async invalidateContent(itemId: string): Promise<void> {
        const patterns = [
            this.buildKey(CachePatterns.ITEM_KEY, { itemId }),
            `prediction:*:${itemId}`,
            'items:jurisdiction:*',
            'items:topic:*',
        ];

        for (const pattern of patterns) {
            await this.client.invalidatePattern(pattern);
        }
    }

    async invalidateJurisdiction(countryCode: string): Promise<void> {
        const pattern = this.buildKey(CachePatterns.ITEMS_BY_JURISDICTION_KEY, { countryCode });
        await this.client.invalidatePattern(pattern);
    }

    async invalidateTopic(topic: string): Promise<void> {
        const pattern = this.buildKey(CachePatterns.ITEMS_BY_TOPIC_KEY, { topic });
        await this.client.invalidatePattern(pattern);
    }

    // Bulk operations
    async getMultipleItems(itemIds: string[]): Promise<Record<string, any>> {
        if (itemIds.length === 0) {
            return {};
        }

        const keys = itemIds.map(itemId =>
            this.buildKey(CachePatterns.ITEM_KEY, { itemId })
        );

        const results = await this.client.getMultiple(keys);
        const items: Record<string, any> = {};

        for (let i = 0; i < itemIds.length; i++) {
            const key = keys[i];
            const data = results[key];
            if (data) {
                try {
                    items[itemIds[i]] = JSON.parse(data);
                } catch (error) {
                    // Skip invalid JSON
                }
            }
        }

        return items;
    }

    async setMultipleItems(items: Record<string, any>): Promise<void> {
        if (Object.keys(items).length === 0) {
            return;
        }

        const pairs: Record<string, any> = {};
        for (const [itemId, item] of Object.entries(items)) {
            const key = this.buildKey(CachePatterns.ITEM_KEY, { itemId });
            pairs[key] = item;
        }

        await this.client.setMultiple(pairs, CachePatterns.TTL.ITEM_DATA);
    }

    // Analytics and metrics
    async setMetric(service: string, metricName: string, value: any): Promise<void> {
        const key = this.buildKey(CachePatterns.METRICS_KEY, { service, metricName });
        await this.client.set(key, value, CachePatterns.TTL.METRICS);
    }

    async getMetric(service: string, metricName: string): Promise<any> {
        const key = this.buildKey(CachePatterns.METRICS_KEY, { service, metricName });
        return await this.client.getJSON(key);
    }

    async setAnalytics(userId: string, date: string, analytics: any): Promise<void> {
        const key = this.buildKey(CachePatterns.ANALYTICS_KEY, { userId, date });
        await this.client.set(key, analytics, CachePatterns.TTL.ANALYTICS);
    }

    async getAnalytics(userId: string, date: string): Promise<any> {
        const key = this.buildKey(CachePatterns.ANALYTICS_KEY, { userId, date });
        return await this.client.getJSON(key);
    }

    // Configuration
    async getConfig(serviceName: string): Promise<any> {
        const key = this.buildKey(CachePatterns.CONFIG_KEY, { serviceName });
        return await this.client.getJSON(key);
    }

    async setConfig(serviceName: string, config: any): Promise<void> {
        const key = this.buildKey(CachePatterns.CONFIG_KEY, { serviceName });
        await this.client.set(key, config, CachePatterns.TTL.CONFIG);
    }
}