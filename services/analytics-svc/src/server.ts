import Fastify from 'fastify'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { startConsumers } from './kafka/consumers'
import { metrics } from './metrics'

const env = loadEnv(process.env)
startTelemetry('analytics-svc')

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok' }))

app.get('/metrics', async (req, reply) => {
  const body = await metrics()
  reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  return reply.send(body)
})

startConsumers(env.KAFKA_BROKERS).catch((e) => app.log.error({ err: e }, 'Kafka consumer failed'))

const port = env.PORT || 3004
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`analytics-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
