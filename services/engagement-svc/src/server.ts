import Fastify from 'fastify'
import { Server as IOServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createRedis } from '@drivemaster/redis-client'
import { NotificationService } from './services/notification-service.js'
import { notificationRoutes } from './routes/notifications.js'

initTelemetry()
const env = loadEnv()
const app = Fastify({ logger: true })

// Initialize Redis connection
const redis = createRedis(env.REDIS_URL || 'redis://localhost:6379')

// Initialize notification service
const notificationService = new NotificationService(redis)

// Register services as decorators
app.decorate('redis', redis)
app.decorate('notificationService', notificationService)

// Socket.io setup
const server = app.server
const io = new IOServer(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})

if (env.REDIS_URL) {
  const pub = createRedis(env.REDIS_URL)
  const sub = createRedis(env.REDIS_URL)
  io.adapter(createAdapter(pub, sub))
}

// Socket.io connection handling
io.on('connection', (socket) => {
  app.log.info(`Client connected: ${socket.id}`)

  socket.emit('welcome', {
    id: socket.id,
    timestamp: new Date().toISOString(),
  })

  // Handle notification delivery confirmations
  socket.on('notification_delivered', async (data) => {
    try {
      await notificationService.trackEngagementMetrics(data.notificationId, {
        userId: data.userId,
        delivered: true,
        deliveryTime: new Date(),
        platform: 'push',
      })
    } catch (error) {
      app.log.error('Error tracking notification delivery:', error)
    }
  })

  socket.on('notification_opened', async (data) => {
    try {
      await notificationService.trackEngagementMetrics(data.notificationId, {
        userId: data.userId,
        delivered: true,
        opened: true,
        openTime: new Date(),
        deliveryTime: data.deliveryTime ? new Date(data.deliveryTime) : new Date(),
        platform: 'push',
      })
    } catch (error) {
      app.log.error('Error tracking notification open:', error)
    }
  })

  socket.on('notification_clicked', async (data) => {
    try {
      await notificationService.trackEngagementMetrics(data.notificationId, {
        userId: data.userId,
        delivered: true,
        opened: true,
        clicked: true,
        clickTime: new Date(),
        deliveryTime: data.deliveryTime ? new Date(data.deliveryTime) : new Date(),
        platform: 'push',
      })
    } catch (error) {
      app.log.error('Error tracking notification click:', error)
    }
  })

  socket.on('disconnect', () => {
    app.log.info(`Client disconnected: ${socket.id}`)
  })
})

// Register routes
await app.register(notificationRoutes)

// Health check endpoint
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  service: 'engagement-svc',
}))

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully`)

  try {
    await app.close()
    await redis.quit()
    process.exit(0)
  } catch (error) {
    app.log.error('Error during shutdown:', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start scheduled notification processor
const startNotificationProcessor = () => {
  setInterval(async () => {
    try {
      await notificationService.processScheduledNotifications()
    } catch (error) {
      app.log.error('Error processing scheduled notifications:', error)
    }
  }, 60000) // Process every minute
}

// Start the server
app
  .listen({ port: env.PORT || 3005, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`engagement-svc listening on ${env.PORT || 3005}`)
    startNotificationProcessor()
  })
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
