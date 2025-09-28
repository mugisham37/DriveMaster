import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'

initTelemetry()
const env = loadEnv()
const app = Fastify({ logger: true })
await app.register(jwt, { secret: env.JWT_SECRET || 'change_me' })

app.get('/health', async () => ({ status: 'ok' }))

// TODO: implement BKT, MAB, spaced repetition, IRT orchestration endpoints

app.listen({ port: env.PORT || 3002, host: '0.0.0.0' })
  .then(() => app.log.info(`adaptive-svc listening on ${env.PORT || 3002}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
