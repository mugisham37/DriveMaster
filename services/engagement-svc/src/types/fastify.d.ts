import { Redis } from 'ioredis'
import { NotificationService } from '../services/notification-service.js'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
    notificationService: NotificationService
  }
}
