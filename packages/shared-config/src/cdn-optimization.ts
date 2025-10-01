import { createHash } from 'crypto'

import { FastifyRequest, FastifyReply } from 'fastify'

export interface CDNConfig {
  provider: 'cloudflare' | 'aws' | 'azure' | 'gcp'
  baseUrl: string
  zones: {
    static: string
    images: string
    videos: string
    api: string
  }
  caching: {
    staticAssets: number // seconds
    images: number // seconds
    videos: number // seconds
    apiResponses: number // seconds
  }
  compression: {
    enabled: boolean
    algorithms: string[]
    minSize: number // bytes
  }
  security: {
    hotlinkProtection: boolean
    tokenAuth: boolean
    ipWhitelist?: string[] | undefined
  }
}

export interface OptimizationOptions {
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | undefined
  quality?: number | undefined
  width?: number | undefined
  height?: number | undefined
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' | undefined
  progressive?: boolean | undefined
  lossless?: boolean | undefined
}

export interface CacheStrategy {
  ttl: number
  staleWhileRevalidate?: number | undefined
  staleIfError?: number | undefined
  mustRevalidate?: boolean | undefined
  public?: boolean | undefined
  immutable?: boolean | undefined
}

export class CDNOptimizer {
  private config: CDNConfig

  constructor(config: CDNConfig) {
    this.config = config
  }

  /**
   * Generate optimized CDN URL for static assets
   */
  getStaticAssetUrl(path: string, options?: OptimizationOptions): string {
    const baseUrl = this.config.zones.static
    const optimizedPath = this.applyOptimizations(path, options)
    return `${baseUrl}${optimizedPath}`
  }

  /**
   * Generate optimized CDN URL for images
   */
  getImageUrl(path: string, options?: OptimizationOptions): string {
    const baseUrl = this.config.zones.images
    const optimizedPath = this.applyImageOptimizations(path, options)
    return `${baseUrl}${optimizedPath}`
  }

  /**
   * Generate optimized CDN URL for videos
   */
  getVideoUrl(path: string, options?: { quality?: string; format?: string }): string {
    const baseUrl = this.config.zones.videos
    let optimizedPath = path

    if (options !== undefined) {
      const params = new URLSearchParams()
      if (options.quality !== undefined && options.quality !== null) {
        params.append('q', options.quality)
      }
      if (options.format !== undefined && options.format !== null) {
        params.append('f', options.format)
      }

      const queryString = params.toString()
      optimizedPath = queryString.length > 0 ? `${path}?${queryString}` : path
    }

    return `${baseUrl}${optimizedPath}`
  }

  /**
   * Middleware for CDN optimization headers
   */
  middleware(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // Add CDN optimization headers
      await this.addCacheHeaders(request, reply)
      await this.addCompressionHeaders(request, reply)
      await this.addSecurityHeaders(request, reply)
      await this.addPerformanceHeaders(request, reply)
    }
  }

  /**
   * Generate cache headers based on content type and strategy
   */
  private async addCacheHeaders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const url = request.url
    const strategy = this.getCacheStrategy(url)

    if (strategy !== null) {
      const cacheControl = this.buildCacheControlHeader(strategy)
      await reply.header('Cache-Control', cacheControl)

      if (
        strategy.staleWhileRevalidate !== undefined &&
        strategy.staleWhileRevalidate !== null &&
        strategy.staleWhileRevalidate > 0
      ) {
        await reply.header(
          'CDN-Cache-Control',
          `max-age=${strategy.ttl}, stale-while-revalidate=${strategy.staleWhileRevalidate}`,
        )
      }

      // Add ETag for cache validation
      const etag = this.generateETag(request)
      if (etag.length > 0) {
        await reply.header('ETag', etag)
      }

      // Add Last-Modified header
      await reply.header('Last-Modified', new Date().toUTCString())

      // Handle conditional requests
      if (request.headers['if-none-match'] === etag) {
        await reply.code(304)
        await reply.send()
        return
      }
    }
  }

  /**
   * Add compression headers
   */
  private async addCompressionHeaders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.config.compression.enabled) return

    const acceptEncoding = String(request.headers['accept-encoding'] ?? '')
    const supportedEncodings = this.config.compression.algorithms

    // Determine best compression algorithm
    let bestEncoding = ''
    for (const encoding of supportedEncodings) {
      if (acceptEncoding.includes(encoding)) {
        bestEncoding = encoding
        break
      }
    }

    if (bestEncoding.length > 0) {
      await reply.header('Content-Encoding', bestEncoding)
      await reply.header('Vary', 'Accept-Encoding')
    }
  }

  /**
   * Add security headers for CDN
   */
  private async addSecurityHeaders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // CORS headers for CDN resources
    await reply.header('Access-Control-Allow-Origin', '*')
    await reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    await reply.header('Access-Control-Max-Age', '86400')

    // Security headers
    await reply.header('X-Content-Type-Options', 'nosniff')
    await reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Hotlink protection
    if (this.config.security.hotlinkProtection === true) {
      const referer = request.headers.referer
      if (typeof referer === 'string' && !this.isAllowedReferer(referer)) {
        await reply.code(403)
        await reply.send({ error: 'Hotlinking not allowed' })
        return
      }
    }

    // IP whitelist check
    if (this.config.security.ipWhitelist !== undefined) {
      const clientIP = this.getClientIP(request)
      if (!this.config.security.ipWhitelist.includes(clientIP)) {
        await reply.code(403)
        await reply.send({ error: 'IP not whitelisted' })
        return
      }
    }
  }

  /**
   * Add performance optimization headers
   */
  private async addPerformanceHeaders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Resource hints
    await reply.header(
      'Link',
      [
        '</static/css/main.css>; rel=preload; as=style',
        '</static/js/main.js>; rel=preload; as=script',
        '<https://fonts.googleapis.com>; rel=preconnect',
      ].join(', '),
    )

    // Service Worker headers
    if (request.url.includes('sw.js')) {
      await reply.header('Service-Worker-Allowed', '/')
      await reply.header('Cache-Control', 'no-cache')
    }

    // Critical resource hints
    if (this.isCriticalResource(request.url)) {
      await reply.header('X-Priority', 'high')
    }
  }

  /**
   * Apply image optimizations based on options
   */
  private applyImageOptimizations(path: string, options?: OptimizationOptions): string {
    if (options === undefined) return path

    const params = new URLSearchParams()

    // Format optimization
    if (options.format !== undefined && options.format !== null) {
      params.append('f', options.format)
    } else {
      // Auto-detect best format based on user agent
      params.append('f', 'auto')
    }

    // Quality optimization
    if (options.quality !== undefined && options.quality !== null && options.quality > 0) {
      params.append('q', options.quality.toString())
    } else {
      params.append('q', 'auto')
    }

    // Dimension optimization
    if (options.width !== undefined && options.width !== null && options.width > 0) {
      params.append('w', options.width.toString())
    }
    if (options.height !== undefined && options.height !== null && options.height > 0) {
      params.append('h', options.height.toString())
    }
    if (options.fit !== undefined && options.fit !== null) {
      params.append('fit', options.fit)
    }

    // Progressive loading
    if (options.progressive === true) {
      params.append('progressive', 'true')
    }

    // Lossless compression
    if (options.lossless === true) {
      params.append('lossless', 'true')
    }

    const queryString = params.toString()
    return queryString.length > 0 ? `${path}?${queryString}` : path
  }

  /**
   * Apply general optimizations
   */
  private applyOptimizations(path: string, _options?: OptimizationOptions): string {
    // For now, just return the path as-is for non-image assets
    // In a real implementation, you might apply minification, etc.
    return path
  }

  /**
   * Get cache strategy based on URL pattern
   */
  private getCacheStrategy(url: string): CacheStrategy | null {
    // Static assets (CSS, JS, fonts)
    if (/\.(css|js|woff2?|ttf|eot)$/.test(url)) {
      return {
        ttl: this.config.caching.staticAssets,
        public: true,
        immutable: true,
        staleWhileRevalidate: 86400, // 1 day
      }
    }

    // Images
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(url)) {
      return {
        ttl: this.config.caching.images,
        public: true,
        staleWhileRevalidate: 3600, // 1 hour
      }
    }

    // Videos
    if (/\.(mp4|webm|ogg|avi|mov)$/.test(url)) {
      return {
        ttl: this.config.caching.videos,
        public: true,
        staleWhileRevalidate: 7200, // 2 hours
      }
    }

    // API responses
    if (url.startsWith('/api/')) {
      return {
        ttl: this.config.caching.apiResponses,
        public: false,
        mustRevalidate: true,
        staleIfError: 300, // 5 minutes
      }
    }

    return null
  }

  /**
   * Build Cache-Control header value
   */
  private buildCacheControlHeader(strategy: CacheStrategy): string {
    const directives: string[] = []

    if (strategy.public === true) {
      directives.push('public')
    } else {
      directives.push('private')
    }

    directives.push(`max-age=${strategy.ttl}`)

    if (strategy.mustRevalidate === true) {
      directives.push('must-revalidate')
    }

    if (strategy.immutable === true) {
      directives.push('immutable')
    }

    if (
      strategy.staleWhileRevalidate !== undefined &&
      strategy.staleWhileRevalidate !== null &&
      strategy.staleWhileRevalidate > 0
    ) {
      directives.push(`stale-while-revalidate=${strategy.staleWhileRevalidate}`)
    }

    if (
      strategy.staleIfError !== undefined &&
      strategy.staleIfError !== null &&
      strategy.staleIfError > 0
    ) {
      directives.push(`stale-if-error=${strategy.staleIfError}`)
    }

    return directives.join(', ')
  }

  /**
   * Generate ETag for cache validation
   */
  private generateETag(request: FastifyRequest): string {
    // Simple ETag generation based on URL and timestamp
    // In production, you'd want to use actual content hash
    const content = `${request.url}-${Date.now()}`
    return `"${createHash('md5').update(content).digest('hex')}"`
  }

  /**
   * Check if referer is allowed for hotlink protection
   */
  private isAllowedReferer(referer: string): boolean {
    const allowedDomains = ['drivemaster.app', 'localhost', '127.0.0.1']

    try {
      const refererUrl = new URL(referer)
      return allowedDomains.some(
        (domain) => refererUrl.hostname === domain || refererUrl.hostname.endsWith(`.${domain}`),
      )
    } catch {
      return false
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: FastifyRequest): string {
    const cfConnectingIp = request.headers['cf-connecting-ip']
    const xForwardedFor = request.headers['x-forwarded-for']
    const xRealIp = request.headers['x-real-ip']
    const requestIp = request.ip

    if (typeof cfConnectingIp === 'string') return cfConnectingIp
    if (typeof xForwardedFor === 'string') return xForwardedFor
    if (typeof xRealIp === 'string') return xRealIp
    if (typeof requestIp === 'string' && requestIp.length > 0) return requestIp

    return 'unknown'
  }

  /**
   * Check if resource is critical for performance
   */
  private isCriticalResource(url: string): boolean {
    const criticalPatterns = [
      /\/api\/v\d+\/user\/profile/,
      /\/api\/v\d+\/adaptive\/next-question/,
      /\/static\/css\/critical\.css/,
      /\/static\/js\/critical\.js/,
    ]

    return criticalPatterns.some((pattern) => pattern.test(url))
  }

  /**
   * Purge CDN cache for specific URLs
   */
  async purgeCacheUrls(urls: string[]): Promise<void> {
    // Implementation depends on CDN provider
    switch (this.config.provider) {
      case 'cloudflare':
        await this.purgeCloudflareCache(urls)
        break
      case 'aws':
        await this.purgeAWSCache(urls)
        break
      default:
        // Use proper logging instead of console
        throw new Error(`Cache purging not implemented for provider: ${this.config.provider}`)
    }
  }

  /**
   * Purge entire CDN cache
   */
  async purgeAllCache(): Promise<void> {
    // Implementation depends on CDN provider
    await this.purgeCacheUrls(['/*']) // Purge all URLs
  }

  // Provider-specific cache purging methods
  private async purgeCloudflareCache(urls: string[]): Promise<void> {
    // Cloudflare API implementation
    // In a real implementation, this would make API calls to Cloudflare
    await Promise.resolve() // Placeholder for actual implementation
    if (urls.length === 0) {
      throw new Error('No URLs provided for cache purging')
    }
  }

  private async purgeAWSCache(urls: string[]): Promise<void> {
    // AWS CloudFront API implementation
    // In a real implementation, this would make API calls to AWS CloudFront
    await Promise.resolve() // Placeholder for actual implementation
    if (urls.length === 0) {
      throw new Error('No URLs provided for cache purging')
    }
  }
}

// Responsive image helper
export class ResponsiveImageHelper {
  private cdnOptimizer: CDNOptimizer

  constructor(cdnOptimizer: CDNOptimizer) {
    this.cdnOptimizer = cdnOptimizer
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(imagePath: string, sizes: number[]): string {
    return sizes
      .map((size) => {
        const url = this.cdnOptimizer.getImageUrl(imagePath, {
          width: size,
          format: 'webp',
          quality: 80,
        })
        return `${url} ${size}w`
      })
      .join(', ')
  }

  /**
   * Generate picture element with multiple formats
   */
  generatePictureElement(imagePath: string, alt: string, sizes: number[]): string {
    const webpSrcSet = this.generateSrcSet(imagePath, sizes)
    const jpegSrcSet = sizes
      .map((size) => {
        const url = this.cdnOptimizer.getImageUrl(imagePath, {
          width: size,
          format: 'jpeg',
          quality: 80,
        })
        return `${url} ${size}w`
      })
      .join(', ')

    return `
      <picture>
        <source srcset="${webpSrcSet}" type="image/webp">
        <source srcset="${jpegSrcSet}" type="image/jpeg">
        <img src="${this.cdnOptimizer.getImageUrl(imagePath, sizes[0] !== undefined ? { width: sizes[0] } : {})}" 
             alt="${alt}" 
             loading="lazy">
      </picture>
    `.trim()
  }
}

// Factory function for creating CDN optimizer
export function createCDNOptimizer(): CDNOptimizer {
  const config: CDNConfig = {
    provider: 'cloudflare',
    baseUrl: 'https://cdn.drivemaster.app',
    zones: {
      static: 'https://static.drivemaster.app',
      images: 'https://images.drivemaster.app',
      videos: 'https://videos.drivemaster.app',
      api: 'https://api.drivemaster.app',
    },
    caching: {
      staticAssets: 31536000, // 1 year
      images: 2592000, // 30 days
      videos: 2592000, // 30 days
      apiResponses: 300, // 5 minutes
    },
    compression: {
      enabled: true,
      algorithms: ['br', 'gzip', 'deflate'],
      minSize: 1024, // 1KB
    },
    security: {
      hotlinkProtection: true,
      tokenAuth: false,
    },
  }

  return new CDNOptimizer(config)
}
