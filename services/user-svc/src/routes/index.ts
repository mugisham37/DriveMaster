import type { FastifyInstance } from 'fastify'

import { authRoutes } from './auth'
import { complianceRoutes } from './compliance'
import { securityRoutes } from './security'
import { socialRoutes } from './social'
import { userRoutes } from './users'

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Register API routes with versioning
  await server.register(
    async function (server) {
      await server.register(authRoutes, { prefix: '/auth' })
      await server.register(userRoutes, { prefix: '/users' })
      await server.register(socialRoutes, { prefix: '/social' })
      await server.register(securityRoutes, { prefix: '/security' })
      await server.register(complianceRoutes, { prefix: '/compliance' })
    },
    { prefix: '/api/v1' },
  )
}
