'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.ServiceConfigSchema =
  exports.ElasticsearchConfigSchema =
  exports.KafkaConfigSchema =
  exports.RedisConfigSchema =
  exports.DatabaseConfigSchema =
    void 0
exports.loadEnvironmentConfig = loadEnvironmentConfig
const zod_1 = require('zod')
// Environment validation schemas
exports.DatabaseConfigSchema = zod_1.z.object({
  host: zod_1.z.string().default('localhost'),
  port: zod_1.z.coerce.number().default(5432),
  database: zod_1.z.string(),
  username: zod_1.z.string(),
  password: zod_1.z.string(),
  ssl: zod_1.z.boolean().default(false),
  maxConnections: zod_1.z.coerce.number().default(20),
  idleTimeoutMs: zod_1.z.coerce.number().default(30000),
  connectionTimeoutMs: zod_1.z.coerce.number().default(2000),
})
exports.RedisConfigSchema = zod_1.z.object({
  host: zod_1.z.string().default('localhost'),
  port: zod_1.z.coerce.number().default(6379),
  password: zod_1.z.string().optional(),
  db: zod_1.z.coerce.number().default(0),
  maxRetriesPerRequest: zod_1.z.coerce.number().default(3),
  retryDelayOnFailover: zod_1.z.coerce.number().default(100),
  enableReadyCheck: zod_1.z.boolean().default(true),
})
exports.KafkaConfigSchema = zod_1.z.object({
  brokers: zod_1.z.array(zod_1.z.string()).default(['localhost:9092']),
  clientId: zod_1.z.string(),
  groupId: zod_1.z.string(),
  connectionTimeout: zod_1.z.coerce.number().default(3000),
  requestTimeout: zod_1.z.coerce.number().default(30000),
  retry: zod_1.z
    .object({
      initialRetryTime: zod_1.z.coerce.number().default(100),
      retries: zod_1.z.coerce.number().default(8),
    })
    .default({}),
})
exports.ElasticsearchConfigSchema = zod_1.z.object({
  node: zod_1.z.string().default('http://localhost:9200'),
  maxRetries: zod_1.z.coerce.number().default(3),
  requestTimeout: zod_1.z.coerce.number().default(30000),
  pingTimeout: zod_1.z.coerce.number().default(3000),
})
exports.ServiceConfigSchema = zod_1.z.object({
  name: zod_1.z.string(),
  version: zod_1.z.string().default('1.0.0'),
  port: zod_1.z.coerce.number(),
  host: zod_1.z.string().default('0.0.0.0'),
  environment: zod_1.z.enum(['development', 'staging', 'production']).default('development'),
  logLevel: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  cors: zod_1.z
    .object({
      origin: zod_1.z
        .union([zod_1.z.string(), zod_1.z.array(zod_1.z.string()), zod_1.z.boolean()])
        .default(true),
      credentials: zod_1.z.boolean().default(true),
    })
    .default({}),
})
// Environment loader utility
function loadEnvironmentConfig() {
  const database = exports.DatabaseConfigSchema.parse({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    maxConnections: process.env.DB_MAX_CONNECTIONS,
    idleTimeoutMs: process.env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMs: process.env.DB_CONNECTION_TIMEOUT_MS,
  })
  const redis = exports.RedisConfigSchema.parse({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
    maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES,
    retryDelayOnFailover: process.env.REDIS_RETRY_DELAY,
    enableReadyCheck: process.env.REDIS_READY_CHECK === 'true',
  })
  const kafka = exports.KafkaConfigSchema.parse({
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID,
    groupId: process.env.KAFKA_GROUP_ID,
    connectionTimeout: process.env.KAFKA_CONNECTION_TIMEOUT,
    requestTimeout: process.env.KAFKA_REQUEST_TIMEOUT,
    retry: {
      initialRetryTime: process.env.KAFKA_INITIAL_RETRY_TIME,
      retries: process.env.KAFKA_RETRIES,
    },
  })
  const elasticsearch = exports.ElasticsearchConfigSchema.parse({
    node: process.env.ELASTICSEARCH_NODE,
    maxRetries: process.env.ELASTICSEARCH_MAX_RETRIES,
    requestTimeout: process.env.ELASTICSEARCH_REQUEST_TIMEOUT,
    pingTimeout: process.env.ELASTICSEARCH_PING_TIMEOUT,
  })
  const service = exports.ServiceConfigSchema.parse({
    name: process.env.SERVICE_NAME,
    version: process.env.SERVICE_VERSION,
    port: process.env.PORT,
    host: process.env.HOST,
    environment: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
  })
  return {
    database,
    redis,
    kafka,
    elasticsearch,
    service,
  }
}
//# sourceMappingURL=environment.js.map
