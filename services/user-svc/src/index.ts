import { fastify } from 'fastify'

import { registerPlugins } from './plugins'
import { registerRoutes } from './routes'

async function buildServer(): Promise<ReturnType<typeof fastify>> {
  const server = fastify({
    logger: {
      level: 'info',
    },
    requestIdLogLabel: 'requestId',
    requestIdHeader: 'x-request-id',
  })

  // Register plugins
  await registerPlugins(server)

  // Register routes
  await registerRoutes(server)

  return server
}

async function start(): Promise<void> {
  try {
    const server = await buildServer()

    await server.listen({
      port: 3001,
      host: '0.0.0.0',
    })

    console.log('🚀 User Service running on http://0.0.0.0:3001')
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  void start()
}

export { buildServer }
