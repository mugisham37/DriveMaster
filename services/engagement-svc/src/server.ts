import Fastify from 'fastify'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { Server } from 'socket.io'
import http from 'http'

const env = loadEnv(process.env)
startTelemetry('engagement-svc')

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok' }))

const port = env.PORT || 3005
const server = http.createServer()
const io = new Server(server, { cors: { origin: '*' } })

io.on('connection', (socket) => {
  socket.emit('welcome', { message: 'Connected to engagement-svc' })
})

server.listen(port, () => {
  app.log.info(`engagement-svc socket server on ${port}`)
})