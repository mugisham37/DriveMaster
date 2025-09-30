import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { PerformanceConfig } from './types'

export interface CompressionOptions {
  threshold?: number
  level?: number
  algorithms?: string[]
}

const compressionPlugin: FastifyPluginAsync<CompressionOptions> = async (fastify, options) => {
  const config = {
    threshold: options.threshold || 1024,
    level: options.level || 6,
    algorithms: options.algorithms || ['gzip', 'deflate', 'br'],
  }

  fastify.addHook('onSend', async (request, reply, payload) => {
    // Skip compression for certain content types
    const contentType = reply.getHeader('content-type') as string
    if (
      contentType &&
      (contentType.includes('image/') ||
        contentType.includes('video/') ||
        contentType.includes('audio/') ||
        contentType.includes('application/octet-stream'))
    ) {
      return payload
    }

    // Skip if already compressed
    if (reply.getHeader('content-encoding')) {
      return payload
    }

    // Check payload size
    const payloadSize = Buffer.isBuffer(payload)
      ? payload.length
      : Buffer.byteLength(payload?.toString() || '', 'utf8')

    if (payloadSize < config.threshold) {
      return payload
    }

    // Get accepted encodings
    const acceptEncoding = (request.headers['accept-encoding'] as string) || ''

    let encoding: string | null = null
    let compressedPayload: Buffer

    // Choose best compression algorithm
    if (acceptEncoding.includes('br') && config.algorithms.includes('br')) {
      encoding = 'br'
      const zlib = await import('zlib')
      compressedPayload = zlib.brotliCompressSync(payload as Buffer, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: config.level,
        },
      })
    } else if (acceptEncoding.includes('gzip') && config.algorithms.includes('gzip')) {
      encoding = 'gzip'
      const zlib = await import('zlib')
      compressedPayload = zlib.gzipSync(payload as Buffer, { level: config.level })
    } else if (acceptEncoding.includes('deflate') && config.algorithms.includes('deflate')) {
      encoding = 'deflate'
      const zlib = await import('zlib')
      compressedPayload = zlib.deflateSync(payload as Buffer, { level: config.level })
    }

    if (encoding && compressedPayload!) {
      reply.header('content-encoding', encoding)
      reply.header('vary', 'accept-encoding')
      reply.header('content-length', compressedPayload.length)
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
