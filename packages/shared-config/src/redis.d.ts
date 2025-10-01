import Redis from 'ioredis'
import type { RedisConfig } from './environment'
export interface RedisConnection {
  client: Redis
  close: () => Promise<void>
}
export declare function createRedisConnection(config: RedisConfig): RedisConnection
export declare function checkRedisHealth(client: Redis): Promise<boolean>
export declare class CacheManager {
  private redis
  constructor(redis: Redis)
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean>
  del(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  increment(key: string, by?: number): Promise<number | null>
  expire(key: string, ttlSeconds: number): Promise<boolean>
}
//# sourceMappingURL=redis.d.ts.map
