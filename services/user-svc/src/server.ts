import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { authRoutes } from './routes/auth'
import { tokenRoutes } from './routes/tokens'

const env = loadEnv(process.env)
startTelemetry('user-svc')

const app = Fastify({ logger: true })
app.register(cors, { origin: true })
app.register(jwt, { secret: env.JWT_SECRET })
app.register(rateLimit, { max: 100, timeWindow: '1 minute' })

app.get('/health', async () => ({ status: 'ok' }))

app.register(authRoutes)
app.register(tokenRoutes)

app.get('/v1/users/me', { preHandler: [async (req, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req: any) => {
  return { id: req.user.sub, roles: req.user.roles }
})

const port = env.PORT || 3001
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`user-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
