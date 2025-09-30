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
    maxBatchSize: options.maxBatchSize || 10,
    timeout: options.timeout || 5000,
    endpoint: options.endpoint || '/batch',
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
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { requests } = request.body

      if (requests.length > config.maxBatchSize) {
        return reply.code(400).send({
          error: 'Batch size exceeds maximum allowed',
          maxBatchSize: config.maxBatchSize,
        })
      }

      const responses: BatchResponse[] = []
      const promises = requests.map(async (batchRequest) => {
        try {
          // Create internal request
          const internalResponse = await fastify.inject({
            method: batchRequest.method as any,
            url: batchRequest.url,
            headers: {
              ...batchRequest.headers,
              'x-batch-request': 'true',
              'x-batch-id': batchRequest.id,
            },
            payload: batchRequest.body,
          })

          return {
            id: batchRequest.id,
            statusCode: internalResponse.statusCode,
            headers: internalResponse.headers,
            body: internalResponse.json(),
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
        return reply.code(408).send({
          error: 'Batch request timeout',
          timeout: config.timeout,
        })
      }
    },
  )

  // Middleware to detect batch requests
  fastify.addHook('onRequest', async (request) => {
    if (request.headers['x-batch-request']) {
      request.isBatchRequest = true
      request.batchId = request.headers['x-batch-id'] as string
    }
  })

  // Response optimization for batch requests
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.isBatchRequest) {
      // Add batch metadata to response
      reply.header('x-batch-id', request.batchId)
      reply.header('x-batch-processed', 'true')
    }

    return payload
  })
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
