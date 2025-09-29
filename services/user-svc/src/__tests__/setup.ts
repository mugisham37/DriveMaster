import { FastifyInstance } from 'fastify'
import { buildServer } from '../index'

export async function createTestServer(): Promise<FastifyInstance> {
  // Set test environment
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
  process.env.REDIS_URL = 'redis://localhost:6379/1' // Use different DB for tests

  // Create server instance
  const server = await buildServer()

  return server
}
