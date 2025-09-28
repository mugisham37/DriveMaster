import Fastify from 'fastify'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'

const env = loadEnv(process.env)
startTelemetry('adaptive-svc')

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok' }))

app.post('/v1/recommendations/next-question', async (req, reply) => {
  // TODO: wire user knowledge state and arm stats
  // Placeholder select
  return { questionId: 'placeholder', rationale: 'thompson_sampling_placeholder' }
})

const port = env.PORT || 3002
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`adaptive-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })