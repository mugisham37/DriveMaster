import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'

initTelemetry()
const env = loadEnv()
const app = Fastify({ logger: true })

await app.register(cors)
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
await app.register(jwt, { secret: env.JWT_SECRET || 'change_me' })

app.get('/health', async () => ({ status: 'ok' }))

// TODO: implement auth, users, profiles, sessions

app.listen({ port: env.PORT || 3001, host: '0.0.0.0' })
  .then(() => app.log.info(`user-svc listening on ${env.PORT || 3001}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
