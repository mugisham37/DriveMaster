import type { FastifyInstance } from 'fastify'

import { authRoutes } from './auth'
import { userRoutes } from './users'
import { socialRoutes } from './social'

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Register API routes with versioning
  await server.register(
    async function (server) {
      await server.register(authRoutes, { prefix: '/auth' })
      await server.register(userRoutes, { prefix: '/users' })
      await server.register(socialRoutes, { prefix: '/social' })
    },
    { prefix: '/api/v1' },
  )
}
