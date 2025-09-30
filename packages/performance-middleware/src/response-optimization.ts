import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

export interface ResponseOptimizationOptions {
  minifyJson?: boolean
  removeNullValues?: boolean
  removeEmptyArrays?: boolean
  removeEmptyObjects?: boolean
  maxDepth?: number
}

const responseOptimizationPlugin: FastifyPluginAsync<ResponseOptimizationOptions> = async (
  fastify,
  options,
) => {
  const config = {
    minifyJson: options.minifyJson !== false,
    removeNullValues: options.removeNullValues !== false,
    removeEmptyArrays: options.removeEmptyArrays || false,
    removeEmptyObjects: options.removeEmptyObjects || false,
    maxDepth: options.maxDepth || 10,
  }

  function optimizeObject(obj: any, depth = 0): any {
    if (depth > config.maxDepth) return obj
    if (obj === null || obj === undefined) return config.removeNullValues ? undefined : obj

    if (Array.isArray(obj)) {
      const optimized = obj
        .map((item) => optimizeObject(item, depth + 1))
        .filter((item) => item !== undefined)

      return config.removeEmptyArrays && optimized.length === 0 ? undefined : optimized
    }

    if (typeof obj === 'object' && obj !== null) {
      const optimized: any = {}
      let hasProperties = false

      for (const [key, value] of Object.entries(obj)) {
        const optimizedValue = optimizeObject(value, depth + 1)

        if (optimizedValue !== undefined) {
          optimized[key] = optimizedValue
          hasProperties = true
        }
      }

      return config.removeEmptyObjects && !hasProperties ? undefined : optimized
    }

    return obj
  }

  fastify.addHook('onSend', async (request, reply, payload) => {
    // Skip optimization for non-JSON responses
    const contentType = reply.getHeader('content-type') as string
    if (!contentType || !contentType.includes('application/json')) {
      return payload
    }

    try {
      let data: any

      // Parse payload
      if (typeof payload === 'string') {
        data = JSON.parse(payload)
      } else if (Buffer.isBuffer(payload)) {
        data = JSON.parse(payload.toString())
      } else {
        data = payload
      }

      // Optimize the data
      const optimized = optimizeObject(data)

      // Serialize back to JSON
      const serialized = config.minifyJson
        ? JSON.stringify(optimized)
        : JSON.stringify(optimized, null, 2)

      // Update content-length header
      reply.header('content-length', Buffer.byteLength(serialized, 'utf8'))

      // Add optimization headers
      reply.header('x-response-optimized', 'true')
      reply.header(
        'x-optimization-config',
        JSON.stringify({
          minifyJson: config.minifyJson,
          removeNullValues: config.removeNullValues,
          removeEmptyArrays: config.removeEmptyArrays,
          removeEmptyObjects: config.removeEmptyObjects,
        }),
      )

      return serialized
    } catch (error) {
      // If optimization fails, return original payload
      fastify.log.warn('Response optimization failed:', error)
      return payload
    }
  })

  // Add response size tracking
  fastify.addHook('onResponse', async (request, reply) => {
    const originalSize = request.headers['content-length']
    const optimizedSize = reply.getHeader('content-length')

    if (originalSize && optimizedSize) {
      const savings = parseInt(originalSize as string) - parseInt(optimizedSize as string)
      const percentage = (savings / parseInt(originalSize as string)) * 100

      if (savings > 0) {
        fastify.log.info(`Response optimized: ${savings} bytes saved (${percentage.toFixed(2)}%)`)
      }
    }
  })
}

export { responseOptimizationPlugin }
export default fp(responseOptimizationPlugin, {
  fastify: '4.x',
  name: 'response-optimization-plugin',
})
