import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  POSTGRES_URL: z.string().url(),
  REDIS_URL: z.string(),
  KAFKA_BROKERS: z.string(),
  ELASTICSEARCH_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
})

export type Env = z.infer<typeof envSchema>

export function loadEnv(raw: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('Invalid environment variables', parsed.error.flatten())
    process.exit(1)
  }
  return parsed.data
}