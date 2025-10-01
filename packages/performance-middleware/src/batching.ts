import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

import { BatchRequest, BatchResponse } from './types'

export interface BatchingOptions {
  maxBatchSize?: number
  timeout?: number
  endpoint?: string
}

const requestBatchingPlugin: FastifyPluginAsync<BatchingOptions> = async (fastify, options) => {
  const config = {
    maxBatchSize: options.maxBatchSize ?? 10,
    timeout: options.timeout ?? 5000,
    endpoint: options.endpoint ?? '/batch',
  }

  // Batch processing endpoint
  fastify.post<{
    Body: { requests: BatchRequest[] }
    Reply: { responses: BatchResponse[] }
  }>(
    config.endpoint,
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            requests: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  method: { type: 'string' },
                  url: { type: 'string' },
                  headers: { type: 'object' },
                  body: {},
                },
                required: ['id', 'method', 'url'],
              },
              maxItems: config.maxBatchSize,
            },
          },
          required: ['requests'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              responses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    statusCode: { type: 'number' },
                    headers: { type: 'object' },
                    body: {},
                  },
                },
              },
              error: { type: 'string' },
              maxBatchSize: { type: 'number' },
              timeout: { type: 'number' },
            },
            required: ['responses'],
          },
          400: {
            type: 'object',
            properties: {
              responses: { type: 'array' },
              error: { type: 'string' },
              maxBatchSize: { type: 'number' },
            },
          },
          408: {
            type: 'object',
            properties: {
              responses: { type: 'array' },
              error: { type: 'string' },
              timeout: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { requests } = request.body

      if (requests.length > config.maxBatchSize) {
        void reply.code(400)
        return {
          responses: [],
          error: 'Batch size exceeds maximum allowed',
          maxBatchSize: config.maxBatchSize,
        }
      }

      const promises = requests.map(async (batchRequest): Promise<BatchResponse> => {
        try {
          // Create internal request
          const internalResponse = await fastify.inject({
            method: batchRequest.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
            url: batchRequest.url,
            headers: {
              ...batchRequest.headers,
              'x-batch-request': 'true',
              'x-batch-id': batchRequest.id,
            },
            ...(batchRequest.body !== undefined && { payload: JSON.stringify(batchRequest.body) }),
          })

          // Convert headers to Record<string, string>
          const responseHeaders: Record<string, string> = {}
          Object.entries(internalResponse.headers).forEach(([key, value]) => {
            if (typeof value === 'string') {
              responseHeaders[key] = value
            } else if (Array.isArray(value)) {
              responseHeaders[key] = value.join(', ')
            } else if (value !== undefined) {
              responseHeaders[key] = String(value)
            }
          })

          let responseBody: unknown
          try {
            responseBody = JSON.parse(internalResponse.body)
          } catch {
            responseBody = internalResponse.body
          }

          return {
            id: batchRequest.id,
            statusCode: internalResponse.statusCode,
            headers: responseHeaders,
            body: responseBody,
          }
        } catch (error) {
          return {
            id: batchRequest.id,
            statusCode: 500,
            headers: {},
            body: {
              error: 'Internal server error',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          }
        }
      })

      // Execute all requests with timeout
      try {
        const results = await Promise.race([
          Promise.all(promises),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Batch timeout')), config.timeout),
          ),
        ])

        return { responses: results }
      } catch (error) {
        void reply.code(408)
        return {
          responses: [],
          error: 'Batch request timeout',
          timeout: config.timeout,
        }
      }
    },
  )

  // Middleware to detect batch requests
  fastify.addHook('onRequest', (request) => {
    const batchHeader = request.headers['x-batch-request']
    if (batchHeader !== undefined && batchHeader !== '') {
      request.isBatchRequest = true
      request.batchId = request.headers['x-batch-id'] as string
    }
  })

  // Response optimization for batch requests
  fastify.addHook('onSend', (request, reply, payload) => {
    if (request.isBatchRequest === true) {
      // Add batch metadata to response
      void reply.header('x-batch-id', request.batchId)
      void reply.header('x-batch-processed', 'true')
    }

    return payload
  })

  // Ensure plugin is properly initialized
  await Promise.resolve()
}

// Extend FastifyRequest interface
declare module 'fastify' {
  interface FastifyRequest {
    isBatchRequest?: boolean
    batchId?: string
  }
}

export { requestBatchingPlugin }
export default fp(requestBatchingPlugin, {
  fastify: '4.x',
  name: 'batching-plugin',
})
