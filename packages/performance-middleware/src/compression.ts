import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

export interface CompressionOptions {
  threshold?: number
  level?: number
  algorithms?: string[]
}

const compressionPlugin: FastifyPluginAsync<CompressionOptions> = async (fastify, options) => {
  const config = {
    threshold: options.threshold ?? 1024,
    level: options.level ?? 6,
    algorithms: options.algorithms ?? ['gzip', 'deflate', 'br'],
  }

  // Pre-load zlib module for better performance
  await import('zlib')

  fastify.addHook('onSend', async (request, reply, payload) => {
    // Skip compression for certain content types
    const contentType = reply.getHeader('content-type') as string | undefined
    if (
      contentType !== undefined &&
      contentType !== '' &&
      (contentType.includes('image/') ||
        contentType.includes('video/') ||
        contentType.includes('audio/') ||
        contentType.includes('application/octet-stream'))
    ) {
      return payload
    }

    // Skip if already compressed
    const contentEncoding = reply.getHeader('content-encoding')
    if (contentEncoding !== undefined && contentEncoding !== '') {
      return payload
    }

    // Check payload size
    const payloadString = payload?.toString() ?? ''
    const payloadSize = Buffer.isBuffer(payload)
      ? payload.length
      : Buffer.byteLength(payloadString, 'utf8')

    if (payloadSize < config.threshold) {
      return payload
    }

    // Get accepted encodings
    const acceptEncodingHeader = request.headers['accept-encoding']
    const acceptEncoding = acceptEncodingHeader ?? ''

    if (acceptEncoding === '') {
      return payload
    }

    let encoding: string | null = null
    let compressedPayload: Buffer | undefined

    // Choose best compression algorithm
    if (acceptEncoding.includes('br') && config.algorithms.includes('br')) {
      encoding = 'br'
      const zlib = await import('zlib')
      compressedPayload = zlib.brotliCompressSync(
        Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload)),
        {
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: config.level,
          },
        },
      )
    } else if (acceptEncoding.includes('gzip') && config.algorithms.includes('gzip')) {
      encoding = 'gzip'
      const zlib = await import('zlib')
      compressedPayload = zlib.gzipSync(
        Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload)),
        { level: config.level },
      )
    } else if (acceptEncoding.includes('deflate') && config.algorithms.includes('deflate')) {
      encoding = 'deflate'
      const zlib = await import('zlib')
      compressedPayload = zlib.deflateSync(
        Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload)),
        { level: config.level },
      )
    }

    if (encoding !== null && compressedPayload !== undefined) {
      void reply.header('content-encoding', encoding)
      void reply.header('vary', 'accept-encoding')
      void reply.header('content-length', compressedPayload.length)
      return compressedPayload
    }

    return payload
  })
}

export { compressionPlugin }
export default fp(compressionPlugin, {
  fastify: '4.x',
  name: 'compression-plugin',
})
