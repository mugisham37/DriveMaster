import { FastifyRequest, FastifyReply } from 'fastify'
import { createHash } from 'crypto'

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
    ipWhitelist?: string[]
  }
}

export interface OptimizationOptions {
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  quality?: number
  width?: number
  height?: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  progressive?: boolean
  lossless?: boolean
}

export interface CacheStrategy {
  ttl: number
  staleWhileRevalidate?: number
  staleIfError?: number
  mustRevalidate?: boolean
  public?: boolean
  immutable?: boolean
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

    if (options) {
      const params = new URLSearchParams()
      if (options.quality) params.append('q', options.quality)
      if (options.format) params.append('f', options.format)

      const queryString = params.toString()
      optimizedPath = queryString ? `${path}?${queryString}` : path
    }

    return `${baseUrl}${optimizedPath}`
  }

  /**
   * Middleware for CDN optimization headers
   */
  middleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      // Add CDN optimization headers
      this.addCacheHeaders(request, reply)
      this.addCompressionHeaders(request, reply)
      this.addSecurityHeaders(request, reply)
      this.addPerformanceHeaders(request, reply)
    }
  }

  /**
   * Generate cache headers based on content type and strategy
   */
  private addCacheHeaders(request: FastifyRequest, reply: FastifyReply): void {
    const url = request.url
    const strategy = this.getCacheStrategy(url)

    if (strategy) {
      const cacheControl = this.buildCacheControlHeader(strategy)
      reply.header('Cache-Control', cacheControl)

      if (strategy.staleWhileRevalidate) {
        reply.header(
          'CDN-Cache-Control',
          `max-age=${strategy.ttl}, stale-while-revalidate=${strategy.staleWhileRevalidate}`,
        )
      }

      // Add ETag for cache validation
      const etag = this.generateETag(request)
      if (etag) {
        reply.header('ETag', etag)
      }

      // Add Last-Modified header
      reply.header('Last-Modified', new Date().toUTCString())

      // Handle conditional requests
      if (request.headers['if-none-match'] === etag) {
        reply.code(304)
        return reply.send()
      }
    }
  }

  /**
   * Add compression headers
   */
  private addCompressionHeaders(request: FastifyRequest, reply: FastifyReply): void {
    if (!this.config.compression.enabled) return

    const acceptEncoding = request.headers['accept-encoding'] || ''
    const supportedEncodings = this.config.compression.algorithms

    // Determine best compression algorithm
    let bestEncoding = ''
    for (const encoding of supportedEncodings) {
      if (acceptEncoding.includes(encoding)) {
        bestEncoding = encoding
        break
      }
    }

    if (bestEncoding) {
      reply.header('Content-Encoding', bestEncoding)
      reply.header('Vary', 'Accept-Encoding')
    }
  }

  /**
   * Add security headers for CDN
   */
  private addSecurityHeaders(request: FastifyRequest, reply: FastifyReply): void {
    // CORS headers for CDN resources
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    reply.header('Access-Control-Max-Age', '86400')

    // Security headers
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Hotlink protection
    if (this.config.security.hotlinkProtection) {
      const referer = request.headers.referer
      if (referer && !this.isAllowedReferer(referer)) {
        reply.code(403)
        return reply.send({ error: 'Hotlinking not allowed' })
      }
    }

    // IP whitelist check
    if (this.config.security.ipWhitelist) {
      const clientIP = this.getClientIP(request)
      if (!this.config.security.ipWhitelist.includes(clientIP)) {
        reply.code(403)
        return reply.send({ error: 'IP not whitelisted' })
      }
    }
  }

  /**
   * Add performance optimization headers
   */
  private addPerformanceHeaders(request: FastifyRequest, reply: FastifyReply): void {
    // Resource hints
    reply.header(
      'Link',
      [
        '</static/css/main.css>; rel=preload; as=style',
        '</static/js/main.js>; rel=preload; as=script',
        '<https://fonts.googleapis.com>; rel=preconnect',
      ].join(', '),
    )

    // Service Worker headers
    if (request.url.includes('sw.js')) {
      reply.header('Service-Worker-Allowed', '/')
      reply.header('Cache-Control', 'no-cache')
    }

    // Critical resource hints
    if (this.isCriticalResource(request.url)) {
      reply.header('X-Priority', 'high')
    }
  }

  /**
   * Apply image optimizations based on options
   */
  private applyImageOptimizations(path: string, options?: OptimizationOptions): string {
    if (!options) return path

    const params = new URLSearchParams()

    // Format optimization
    if (options.format) {
      params.append('f', options.format)
    } else {
      // Auto-detect best format based on user agent
      params.append('f', 'auto')
    }

    // Quality optimization
    if (options.quality) {
      params.append('q', options.quality.toString())
    } else {
      params.append('q', 'auto')
    }

    // Dimension optimization
    if (options.width) params.append('w', options.width.toString())
    if (options.height) params.append('h', options.height.toString())
    if (options.fit) params.append('fit', options.fit)

    // Progressive loading
    if (options.progressive) params.append('progressive', 'true')

    // Lossless compression
    if (options.lossless) params.append('lossless', 'true')

    const queryString = params.toString()
    return queryString ? `${path}?${queryString}` : path
  }

  /**
   * Apply general optimizations
   */
  private applyOptimizations(path: string, options?: OptimizationOptions): string {
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

    if (strategy.public) {
      directives.push('public')
    } else {
      directives.push('private')
    }

    directives.push(`max-age=${strategy.ttl}`)

    if (strategy.mustRevalidate) {
      directives.push('must-revalidate')
    }

    if (strategy.immutable) {
      directives.push('immutable')
    }

    if (strategy.staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${strategy.staleWhileRevalidate}`)
    }

    if (strategy.staleIfError) {
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
    return (request.headers['cf-connecting-ip'] ||
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.ip ||
      'unknown') as string
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
        console.warn(`Cache purging not implemented for provider: ${this.config.provider}`)
    }
  }

  /**
   * Purge entire CDN cache
   */
  async purgeAllCache(): Promise<void> {
    // Implementation depends on CDN provider
    console.log('Purging all CDN cache...')
    // This would make actual API calls to the CDN provider
  }

  // Provider-specific cache purging methods
  private async purgeCloudflareCache(urls: string[]): Promise<void> {
    // Cloudflare API implementation
    console.log('Purging Cloudflare cache for URLs:', urls)
  }

  private async purgeAWSCache(urls: string[]): Promise<void> {
    // AWS CloudFront API implementation
    console.log('Purging AWS CloudFront cache for URLs:', urls)
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
        <img src="${this.cdnOptimizer.getImageUrl(imagePath, { width: sizes[0] })}" 
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
