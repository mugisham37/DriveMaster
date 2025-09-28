import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  POSTGRES_URL: z.string().url().optional(),
  REDIS_URL: z.string().optional(),
  KAFKA_BROKERS: z.string().optional(),
  ELASTICSEARCH_URL: z.string().optional(),
  JWT_SECRET: z.string().optional()
})

export type Env = z.infer<typeof EnvSchema>

export function loadEnv(overrides?: Partial<Record<keyof Env, string | number>>): Env {
  const merged = { ...process.env, ...overrides } as Record<string, string>
  const parsed = EnvSchema.safeParse(merged)
  if (!parsed.success) {
    const errs = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment variables:\n${errs}`)
  }
  return {
    ...parsed.data,
    PORT: Number(parsed.data.PORT)
  }
}
