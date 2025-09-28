import Fastify from 'fastify'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { Server } from 'socket.io'
import http from 'http'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import { createRedis } from '@drivemaster/redis-client'

const env = loadEnv(process.env)
startTelemetry('engagement-svc')

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok' }))

const port = env.PORT || 3005
const server = http.createServer()
const io = new Server(server, { cors: { origin: '*' } })

const redis = createRedis(env.REDIS_URL)

const presenceRoomKey = (roomId: string) => `presence:room:${roomId}`
const presenceUserKey = (userId: string) => `presence:user:${userId}`

async function addPresence(roomId: string, userId: string) {
  await redis.sadd(presenceRoomKey(roomId), userId)
  await redis.sadd(presenceUserKey(userId), roomId)
  const users = await redis.smembers(presenceRoomKey(roomId))
  return users
}

async function removePresence(roomId: string, userId: string) {
  await redis.srem(presenceRoomKey(roomId), userId)
  await redis.srem(presenceUserKey(userId), roomId)
  const users = await redis.smembers(presenceRoomKey(roomId))
  return users
}

async function roomsForUser(userId: string) {
  return redis.smembers(presenceUserKey(userId))
}

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

  socket.on('presence:join', async ({ roomId }: { roomId: string }) => {
    if (!roomId) return
    socket.join(roomId)
    const users = await addPresence(roomId, user.id)
    io.to(roomId).emit('presence:update', { roomId, users })
  })

  socket.on('presence:leave', async ({ roomId }: { roomId: string }) => {
    if (!roomId) return
    socket.leave(roomId)
    const users = await removePresence(roomId, user.id)
    io.to(roomId).emit('presence:update', { roomId, users })
  })

  socket.on('challenge:create', async (_: any, cb?: (res: any) => void) => {
    const challengeId = nanoid()
    const roomId = `challenge:${challengeId}`
    socket.join(roomId)
    await addPresence(roomId, user.id)
    io.to(roomId).emit('challenge:created', { challengeId, roomId, ownerId: user.id })
    cb?.({ challengeId, roomId })
  })

  socket.on('challenge:join', async ({ challengeId }: { challengeId: string }) => {
    const roomId = `challenge:${challengeId}`
    socket.join(roomId)
    const users = await addPresence(roomId, user.id)
    io.to(roomId).emit('presence:update', { roomId, users })
  })

  socket.on('challenge:start', ({ challengeId }: { challengeId: string }) => {
    const roomId = `challenge:${challengeId}`
    io.to(roomId).emit('challenge:started', { challengeId, startedAt: Date.now() })
  })

  socket.on('disconnect', async () => {
    const rooms = await roomsForUser(user.id)
    for (const roomId of rooms) {
      const users = await removePresence(roomId, user.id)
      io.to(roomId).emit('presence:update', { roomId, users })
    }
  })
})

server.listen(port, () => {
  app.log.info(`engagement-svc socket server on ${port}`)
})
