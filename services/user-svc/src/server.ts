import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'

const env = loadEnv(process.env)
startTelemetry('user-svc')

const app = Fastify({ logger: true })
await app.register(cors, { origin: true })
await app.register(jwt, { secret: env.JWT_SECRET })

app.get('/health', async () => ({ status: 'ok' }))

app.get('/v1/users/me', async (req, reply) => {
  // placeholder: real implementation will look up the user from JWT and DB
  return { id: 'me', roles: ['user'] }
})

const port = env.PORT || 3001
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`user-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })