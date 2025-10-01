'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.CacheManager = void 0
exports.createRedisConnection = createRedisConnection
exports.checkRedisHealth = checkRedisHealth
const ioredis_1 = __importDefault(require('ioredis'))
function createRedisConnection(config) {
  const redisOptions = {
    host: config.host,
    port: config.port,
    db: config.db,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    enableReadyCheck: config.enableReadyCheck,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
  }
  if (config.password) {
    redisOptions.password = config.password
  }
  const client = new ioredis_1.default(redisOptions)
  // Error handling
  client.on('error', (error) => {
    console.error('Redis connection error:', error)
  })
  client.on('connect', () => {
    console.log('Redis connected successfully')
  })
  client.on('ready', () => {
    console.log('Redis ready for operations')
  })
  client.on('close', () => {
    console.log('Redis connection closed')
  })
  return {
    client,
    close: async () => {
      await client.quit()
    },
  }
}
// Redis health check utility
async function checkRedisHealth(client) {
  try {
    const result = await client.ping()
    return result === 'PONG'
  } catch (error) {
    console.error('Redis health check failed:', error)
    return false
  }
}
// Cache utilities
class CacheManager {
  redis
  constructor(redis) {
    this.redis = redis
  }
  async get(key) {
    try {
      const value = await this.redis.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }
  async set(key, value, ttlSeconds) {
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized)
      } else {
        await this.redis.set(key, serialized)
      }
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }
  async del(key) {
    try {
      const result = await this.redis.del(key)
      return result > 0
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }
  async exists(key) {
    try {
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }
  async increment(key, by = 1) {
    try {
      return await this.redis.incrby(key, by)
    } catch (error) {
      console.error('Cache increment error:', error)
      return null
    }
  }
  async expire(key, ttlSeconds) {
    try {
      const result = await this.redis.expire(key, ttlSeconds)
      return result === 1
    } catch (error) {
      console.error('Cache expire error:', error)
      return false
    }
  }
}
exports.CacheManager = CacheManager
//# sourceMappingURL=redis.js.map
