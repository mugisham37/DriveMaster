import Fastify from 'fastify'
import { Registry, collectDefaultMetrics } from 'prom-client'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'

initTelemetry()
const env = loadEnv()
const app = Fastify({ logger: true })

const registry = new Registry()
collectDefaultMetrics({ register: registry })

app.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', registry.contentType)
  return registry.metrics()
})

app.get('/health', async () => ({ status: 'ok' }))

app.listen({ port: env.PORT || 3004, host: '0.0.0.0' })
  .then(() => app.log.info(`analytics-svc listening on ${env.PORT || 3004}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
