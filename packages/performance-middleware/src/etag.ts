import etag from 'etag'
import { FastifyPlugin } from 'fastify'
import fp from 'fastify-plugin'

export interface EtagOptions {
  weak?: boolean
}

const etagPlugin: FastifyPlugin<EtagOptions> = (fastify, options, done) => {
  const config = {
    weak: options.weak ?? true,
  }

  fastify.addHook('onSend', (request, reply, payload) => {
    // Skip for non-GET requests
    if (request.method !== 'GET') {
      return payload
    }

    // Skip if ETag already set
    const existingEtag = reply.getHeader('etag')
    if (existingEtag !== undefined && existingEtag !== '') {
      return payload
    }

    // Skip for streaming responses
    if (reply.getHeader('transfer-encoding') === 'chunked') {
      return payload
    }

    // Generate ETag
    const payloadString = payload?.toString() ?? ''
    const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payloadString, 'utf8')

    const etagValue = etag(payloadBuffer, { weak: config.weak })
    void reply.header('etag', etagValue)

    // Check if client has matching ETag
    const clientEtag = request.headers['if-none-match']
    if (clientEtag !== undefined && clientEtag !== '' && clientEtag === etagValue) {
      void reply.code(304)
      return ''
    }

    // Add cache control headers for better caching
    const cacheControl = reply.getHeader('cache-control')
    if (cacheControl === undefined || cacheControl === '') {
      void reply.header('cache-control', 'public, max-age=300') // 5 minutes default
    }

    return payload
  })

  done()
}

export { etagPlugin }
export default fp(etagPlugin, {
  fastify: '4.x',
  name: 'etag-plugin',
})
