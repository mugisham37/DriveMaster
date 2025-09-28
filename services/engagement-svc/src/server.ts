import Fastify from 'fastify'
import { Server as IOServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createRedis } from '@drivemaster/redis-client'

initTelemetry()
const env = loadEnv()
const app = Fastify({ logger: true })

const server = app.server
const io = new IOServer(server, { cors: { origin: '*' } })

if (env.REDIS_URL) {
  const pub = createRedis(env.REDIS_URL)
  const sub = createRedis(env.REDIS_URL)
  io.adapter(createAdapter(pub, sub))
}

io.on('connection', (socket) => {
  socket.emit('welcome', { id: socket.id })
})

app.get('/health', async () => ({ status: 'ok' }))

app.listen({ port: env.PORT || 3005, host: '0.0.0.0' })
  .then(() => app.log.info(`engagement-svc listening on ${env.PORT || 3005}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
