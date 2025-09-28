import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createEsClient } from '@drivemaster/es-client'

initTelemetry()
const env = loadEnv()
const app = Fastify({ logger: true })

await app.register(jwt, { secret: env.JWT_SECRET || 'change_me' })

const es = env.ELASTICSEARCH_URL ? createEsClient(env.ELASTICSEARCH_URL) : null

app.get('/health', async () => ({ status: 'ok', es: !!es }))

// TODO: implement content CRUD, indexing, versioning, A/B testing

app.listen({ port: env.PORT || 3003, host: '0.0.0.0' })
  .then(() => app.log.info(`content-svc listening on ${env.PORT || 3003}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
