import { z } from 'zod'

// Environment validation schemas
export const DatabaseConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(5432),
  database: z.string(),
  username: z.string(),
  password: z.string(),
  ssl: z.boolean().default(false),
  maxConnections: z.coerce.number().default(20),
  idleTimeoutMs: z.coerce.number().default(30000),
  connectionTimeoutMs: z.coerce.number().default(2000),
})

export const RedisConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.coerce.number().default(6379),
  password: z.string().optional(),
  db: z.coerce.number().default(0),
  maxRetriesPerRequest: z.coerce.number().default(3),
  retryDelayOnFailover: z.coerce.number().default(100),
  enableReadyCheck: z.boolean().default(true),
})

export const KafkaConfigSchema = z.object({
  brokers: z.array(z.string()).default(['localhost:9092']),
  clientId: z.string(),
  groupId: z.string(),
  connectionTimeout: z.coerce.number().default(3000),
  requestTimeout: z.coerce.number().default(30000),
  retry: z
    .object({
      initialRetryTime: z.coerce.number().default(100),
      retries: z.coerce.number().default(8),
    })
    .default({}),
})

export const ElasticsearchConfigSchema = z.object({
  node: z.string().default('http://localhost:9200'),
  maxRetries: z.coerce.number().default(3),
  requestTimeout: z.coerce.number().default(30000),
  pingTimeout: z.coerce.number().default(3000),
})

export const ServiceConfigSchema = z.object({
  name: z.string(),
  version: z.string().default('1.0.0'),
  port: z.coerce.number(),
  host: z.string().default('0.0.0.0'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  cors: z
    .object({
      origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default(true),
      credentials: z.boolean().default(true),
    })
    .default({}),
})

// Environment configuration type
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>
export type RedisConfig = z.infer<typeof RedisConfigSchema>
export type KafkaConfig = z.infer<typeof KafkaConfigSchema>
export type ElasticsearchConfig = z.infer<typeof ElasticsearchConfigSchema>
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>

// Environment loader utility
export function loadEnvironmentConfig(): {
  database: DatabaseConfig
  redis: RedisConfig
  kafka: KafkaConfig
  elasticsearch: ElasticsearchConfig
  service: ServiceConfig
} {
  const database = DatabaseConfigSchema.parse({
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

  const redis = RedisConfigSchema.parse({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
    maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES,
    retryDelayOnFailover: process.env.REDIS_RETRY_DELAY,
    enableReadyCheck: process.env.REDIS_READY_CHECK === 'true',
  })

  const kafka = KafkaConfigSchema.parse({
    brokers: process.env.KAFKA_BROKERS?.split(',') ?? ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID,
    groupId: process.env.KAFKA_GROUP_ID,
    connectionTimeout: process.env.KAFKA_CONNECTION_TIMEOUT,
    requestTimeout: process.env.KAFKA_REQUEST_TIMEOUT,
    retry: {
      initialRetryTime: process.env.KAFKA_INITIAL_RETRY_TIME,
      retries: process.env.KAFKA_RETRIES,
    },
  })

  const elasticsearch = ElasticsearchConfigSchema.parse({
    node: process.env.ELASTICSEARCH_NODE,
    maxRetries: process.env.ELASTICSEARCH_MAX_RETRIES,
    requestTimeout: process.env.ELASTICSEARCH_REQUEST_TIMEOUT,
    pingTimeout: process.env.ELASTICSEARCH_PING_TIMEOUT,
  })

  const service = ServiceConfigSchema.parse({
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
