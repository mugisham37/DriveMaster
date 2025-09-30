import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import etag from 'etag'

export interface EtagOptions {
  weak?: boolean
}

const etagPlugin: FastifyPluginAsync<EtagOptions> = async (fastify, options) => {
  const config = {
    weak: options.weak !== undefined ? options.weak : true,
  }

  fastify.addHook('onSend', async (request, reply, payload) => {
    // Skip for non-GET requests
    if (request.method !== 'GET') {
      return payload
    }

    // Skip if ETag already set
    if (reply.getHeader('etag')) {
      return payload
    }

    // Skip for streaming responses
    if (reply.getHeader('transfer-encoding') === 'chunked') {
      return payload
    }

    // Generate ETag
    const payloadBuffer = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(payload?.toString() || '', 'utf8')

    const etagValue = etag(payloadBuffer, { weak: config.weak })
    reply.header('etag', etagValue)

    // Check if client has matching ETag
    const clientEtag = request.headers['if-none-match']
    if (clientEtag && clientEtag === etagValue) {
      reply.code(304)
      return ''
    }

    // Add cache control headers for better caching
    if (!reply.getHeader('cache-control')) {
      reply.header('cache-control', 'public, max-age=300') // 5 minutes default
    }

    return payload
  })
}

export { etagPlugin }
export default fp(etagPlugin, {
  fastify: '4.x',
  name: 'etag-plugin',
})
