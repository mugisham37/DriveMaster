import Fastify from 'fastify'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { Server } from 'socket.io'
import http from 'http'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'

const env = loadEnv(process.env)
startTelemetry('engagement-svc')

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok' }))

const port = env.PORT || 3005
const server = http.createServer()
const io = new Server(server, { cors: { origin: '*' } })

// Simple in-memory presence; replace with Redis in production
const roomPresence = new Map<string, Set<string>>()

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token
  if (!token || typeof token !== 'string') return next(new Error('Unauthorized'))
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any
    ;(socket as any).user = { id: payload.sub, roles: payload.roles }
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

io.on('connection', (socket) => {
  const user = (socket as any).user as { id: string; roles: string[] }
  socket.emit('welcome', { message: 'Connected to engagement-svc', userId: user.id })

  socket.on('presence:join', ({ roomId }: { roomId: string }) => {
    if (!roomId) return
    socket.join(roomId)
    const set = roomPresence.get(roomId) ?? new Set<string>()
    set.add(user.id)
    roomPresence.set(roomId, set)
    io.to(roomId).emit('presence:update', { roomId, users: Array.from(set) })
  })

  socket.on('presence:leave', ({ roomId }: { roomId: string }) => {
    if (!roomId) return
    socket.leave(roomId)
    const set = roomPresence.get(roomId)
    if (set) {
      set.delete(user.id)
      io.to(roomId).emit('presence:update', { roomId, users: Array.from(set) })
    }
  })

  socket.on('challenge:create', (_: any, cb?: (res: any) => void) => {
    const challengeId = nanoid()
    const roomId = `challenge:${challengeId}`
    socket.join(roomId)
    const set = new Set<string>()
    set.add(user.id)
    roomPresence.set(roomId, set)
    io.to(roomId).emit('challenge:created', { challengeId, roomId, ownerId: user.id })
    cb?.({ challengeId, roomId })
  })

  socket.on('challenge:join', ({ challengeId }: { challengeId: string }) => {
    const roomId = `challenge:${challengeId}`
    socket.join(roomId)
    const set = roomPresence.get(roomId) ?? new Set<string>()
    set.add(user.id)
    roomPresence.set(roomId, set)
    io.to(roomId).emit('presence:update', { roomId, users: Array.from(set) })
  })

  socket.on('challenge:start', ({ challengeId }: { challengeId: string }) => {
    const roomId = `challenge:${challengeId}`
    io.to(roomId).emit('challenge:started', { challengeId, startedAt: Date.now() })
  })

  socket.on('disconnect', () => {
    for (const [roomId, set] of roomPresence.entries()) {
      if (set.delete(user.id)) io.to(roomId).emit('presence:update', { roomId, users: Array.from(set) })
    }
  })
})

server.listen(port, () => {
  app.log.info(`engagement-svc socket server on ${port}`)
})
