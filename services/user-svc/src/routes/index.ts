import type { FastifyInstance } from 'fastify'

import { authRoutes } from './auth'
import { userRoutes } from './users'

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Register API routes with versioning
  await server.register(
    async function (server) {
      await server.register(authRoutes, { prefix: '/auth' })
      await server.register(userRoutes, { prefix: '/users' })
    },
    { prefix: '/api/v1' },
  )
}
