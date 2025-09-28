import Fastify from 'fastify'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createES } from '@drivemaster/es-client'

const env = loadEnv(process.env)
startTelemetry('content-svc')

const app = Fastify({ logger: true })
const es = createES(env.ELASTICSEARCH_URL)

app.get('/health', async () => ({ status: 'ok' }))

const port = env.PORT || 3003
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`content-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })