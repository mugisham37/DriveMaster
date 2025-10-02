import { config } from 'dotenv'
import { z } from 'zod'

// Load environment variables
config()

// Environment schema
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  KAFKA_BROKERS: z.string().optional(),
  JWT_SECRET: z.string().default('change_me_in_production'),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_ENVIRONMENT: z.string().default('us-west1-gcp'),
  ML_MODEL_PATH: z.string().default('./models'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type Environment = z.infer<typeof EnvSchema>

/**
 * Load and validate environment variables
 */
export function loadEnv(): Environment {
  try {
    return EnvSchema.parse(process.env)
  } catch (error) {
    console.error('Environment validation failed:', error)
    throw new Error('Invalid environment configuration')
  }
}

/**
 * Get a specific environment variable with type safety
 */
export function getEnvVar<K extends keyof Environment>(key: K): Environment[K] {
  const env = loadEnv()
  return env[key]
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return loadEnv().NODE_ENV === 'development'
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return loadEnv().NODE_ENV === 'production'
}

/**
 * Check if we're in test mode
 */
export function isTest(): boolean {
  return loadEnv().NODE_ENV === 'test'
}

// Export the loaded environment for convenience
export const env = loadEnv()
