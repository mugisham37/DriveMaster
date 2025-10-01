import { FastifyPlugin } from 'fastify'
import fp from 'fastify-plugin'

export interface ResponseOptimizationOptions {
  minifyJson?: boolean
  removeNullValues?: boolean
  removeEmptyArrays?: boolean
  removeEmptyObjects?: boolean
  maxDepth?: number
}

const responseOptimizationPlugin: FastifyPlugin<ResponseOptimizationOptions> = (
  fastify,
  options,
  done,
) => {
  const config = {
    minifyJson: options.minifyJson !== false,
    removeNullValues: options.removeNullValues !== false,
    removeEmptyArrays: options.removeEmptyArrays ?? false,
    removeEmptyObjects: options.removeEmptyObjects ?? false,
    maxDepth: options.maxDepth ?? 10,
  }

  function optimizeObject(obj: unknown, depth = 0): unknown {
    if (depth > config.maxDepth) return obj
    if (obj === null || obj === undefined) return config.removeNullValues ? undefined : obj

    if (Array.isArray(obj)) {
      const optimized = obj
        .map((item) => optimizeObject(item, depth + 1))
        .filter((item) => item !== undefined)

      return config.removeEmptyArrays && optimized.length === 0 ? undefined : optimized
    }

    if (typeof obj === 'object' && obj !== null) {
      const optimized: Record<string, unknown> = {}
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

  fastify.addHook('onSend', (request, reply, payload) => {
    // Skip optimization for non-JSON responses
    const contentType = reply.getHeader('content-type') as string | undefined
    if (
      contentType === undefined ||
      contentType === '' ||
      !contentType.includes('application/json')
    ) {
      return payload
    }

    try {
      let data: unknown

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
      void reply.header('content-length', Buffer.byteLength(serialized, 'utf8'))

      // Add optimization headers
      void reply.header('x-response-optimized', 'true')
      void reply.header(
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
      fastify.log.warn(
        `Response optimization failed: ${error instanceof Error ? error.message : String(error)}`,
      )
      return payload
    }
  })

  // Add response size tracking
  fastify.addHook('onResponse', (request, reply) => {
    const originalSizeHeader = request.headers['content-length']
    const optimizedSizeHeader = reply.getHeader('content-length')

    if (
      originalSizeHeader !== undefined &&
      originalSizeHeader !== '' &&
      optimizedSizeHeader !== undefined &&
      optimizedSizeHeader !== ''
    ) {
      const originalSize = parseInt(originalSizeHeader, 10)
      const optimizedSize = parseInt(String(optimizedSizeHeader), 10)
      const savings = originalSize - optimizedSize
      const percentage = (savings / originalSize) * 100

      if (savings > 0) {
        fastify.log.info(`Response optimized: ${savings} bytes saved (${percentage.toFixed(2)}%)`)
      }
    }
  })

  done()
}

export { responseOptimizationPlugin }
export default fp(responseOptimizationPlugin, {
  fastify: '4.x',
  name: 'response-optimization-plugin',
})
