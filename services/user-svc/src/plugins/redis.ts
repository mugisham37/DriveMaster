import { createRedis } from '@drivemaster/redis-client'
import { loadEnv } from '@drivemaster/shared-config'

const env = loadEnv(process.env)
export const redis = createRedis(env.REDIS_URL)