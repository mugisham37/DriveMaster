import Fastify from 'fastify'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'

const env = loadEnv(process.env)
startTelemetry('analytics-svc')

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok' }))

const port = env.PORT || 3004
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`analytics-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })