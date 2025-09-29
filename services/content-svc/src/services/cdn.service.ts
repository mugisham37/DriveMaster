import { createHash } from 'crypto'

export interface CDNConfig {
  baseUrl: string
  apiKey?: string
  zoneId?: string
  purgeEndpoint?: string
  transformEndpoint?: string
}

export interface CacheControl {
  maxAge: number
  sMaxAge?: number
  staleWhileRevalidate?: number
  staleIfError?: number
  mustRevalidate?: boolean
  noCache?: boolean
  noStore?: boolean
  public?: boolean
  private?: boolean
}

export interface ImageTransformOptions {
  width?: number
  height?: number
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto'
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'
  gravity?: 'auto' | 'center' | 'top' | 'bottom' | 'left' | 'right'
  progressive?: boolean
  blur?: number
  sharpen?: number
  brightness?: number
  contrast?: number
  gamma?: number
  metadata?: 'keep' | 'copyright' | 'none'
}

export interface PurgeRequest {
  urls?: string[]
  tags?: string[]
  hosts?: string[]
  prefixes?: string[]
}

export interface CDNAnalytics {
  requests: number
  bandwidth: number
  cacheHitRatio: number
  responseTime: number
  errors: number
  timestamp: Date
}

export class CDNService {
  private config: CDNConfig
  private readonly DEFAULT_CACHE_TTL = 86400 // 24 hours
  private readonly EDGE_CACHE_TTL = 2592000 // 30 days

  constructor(config: CDNConfig) {
    this.config = config
  }

  // URL Generation and Transformation
  generateOptimizedUrl(
    originalUrl: string,
    transformOptions: ImageTransformOptions = {},
    cacheControl?: CacheControl,
  ): string {
    // Remove existing CDN base if present
    const cleanUrl = originalUrl.replace(this.config.baseUrl, '')

    // Build transform URL
    const transformUrl = new URL(
      `${this.config.transformEndpoint || this.config.baseUrl}/cdn-cgi/image`,
      this.config.baseUrl,
    )

    // Add transformation parameters
    const params = new URLSearchParams()

    if (transformOptions.width) params.set('width', transformOptions.width.toString())
    if (transformOptions.height) params.set('height', transformOptions.height.toString())
    if (transformOptions.quality) params.set('quality', transformOptions.quality.toString())
    if (transformOptions.format) params.set('format', transformOptions.format)
    if (transformOptions.fit) params.set('fit', transformOptions.fit)
    if (transformOptions.gravity) params.set('gravity', transformOptions.gravity)
    if (transformOptions.progressive) params.set('progressive', 'true')
    if (transformOptions.blur) params.set('blur', transformOptions.blur.toString())
    if (transformOptions.sharpen) params.set('sharpen', transformOptions.sharpen.toString())
    if (transformOptions.brightness)
      params.set('brightness', transformOptions.brightness.toString())
    if (transformOptions.contrast) params.set('contrast', transformOptions.contrast.toString())
    if (transformOptions.gamma) params.set('gamma', transformOptions.gamma.toString())
    if (transformOptions.metadata) params.set('metadata', transformOptions.metadata)

    // Add cache control if specified
    if (cacheControl) {
      const cacheHeader = this.buildCacheControlHeader(cacheControl)
      params.set('cache', Buffer.from(cacheHeader).toString('base64'))
    }

    // Add the original URL as the last parameter
    params.set('url', cleanUrl)

    transformUrl.search = params.toString()
    return transformUrl.toString()
  }

  generateResponsiveImageSet(
    originalUrl: string,
    breakpoints: number[] = [320, 640, 768, 1024, 1280, 1920],
    transformOptions: Omit<ImageTransformOptions, 'width'> = {},
  ): Array<{ url: string; width: number; descriptor: string }> {
    return breakpoints.map((width) => ({
      url: this.generateOptimizedUrl(originalUrl, { ...transformOptions, width }),
      width,
      descriptor: `${width}w`,
    }))
  }

  // Cache Management
  async purgeCache(request: PurgeRequest): Promise<boolean> {
    if (!this.config.apiKey || !this.config.zoneId) {
      console.warn('CDN API credentials not configured, skipping cache purge')
      return false
    }

    try {
      const purgeUrl =
        this.config.purgeEndpoint ||
        `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`

      const response = await fetch(purgeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const result = await response.json()
      return result.success === true
    } catch (error) {
      console.error('Failed to purge CDN cache:', error)
      return false
    }
  }

  async purgeSingleUrl(url: string): Promise<boolean> {
    return this.purgeCache({ urls: [url] })
  }

  async purgeByTags(tags: string[]): Promise<boolean> {
    return this.purgeCache({ tags })
  }

  async purgeByPrefix(prefixes: string[]): Promise<boolean> {
    return this.purgeCache({ prefixes })
  }

  // Edge Caching Strategies
  buildCacheControlHeader(cacheControl: CacheControl): string {
    const directives: string[] = []

    if (cacheControl.public) directives.push('public')
    if (cacheControl.private) directives.push('private')
    if (cacheControl.noCache) directives.push('no-cache')
    if (cacheControl.noStore) directives.push('no-store')
    if (cacheControl.mustRevalidate) directives.push('must-revalidate')

    if (cacheControl.maxAge !== undefined) {
      directives.push(`max-age=${cacheControl.maxAge}`)
    }
    if (cacheControl.sMaxAge !== undefined) {
      directives.push(`s-maxage=${cacheControl.sMaxAge}`)
    }
    if (cacheControl.staleWhileRevalidate !== undefined) {
      directives.push(`stale-while-revalidate=${cacheControl.staleWhileRevalidate}`)
    }
    if (cacheControl.staleIfError !== undefined) {
      directives.push(`stale-if-error=${cacheControl.staleIfError}`)
    }

    return directives.join(', ')
  }

  getOptimalCacheControl(
    contentType: 'static' | 'dynamic' | 'user-generated',
    isPublic = true,
  ): CacheControl {
    switch (contentType) {
      case 'static':
        return {
          public: isPublic,
          maxAge: this.EDGE_CACHE_TTL,
          sMaxAge: this.EDGE_CACHE_TTL,
          staleWhileRevalidate: 86400, // 1 day
          staleIfError: 604800, // 1 week
        }

      case 'dynamic':
        return {
          public: isPublic,
          maxAge: this.DEFAULT_CACHE_TTL,
          sMaxAge: this.DEFAULT_CACHE_TTL,
          staleWhileRevalidate: 3600, // 1 hour
          mustRevalidate: true,
        }

      case 'user-generated':
        return {
          private: !isPublic,
          maxAge: 3600, // 1 hour
          mustRevalidate: true,
        }

      default:
        return {
          public: isPublic,
          maxAge: this.DEFAULT_CACHE_TTL,
        }
    }
  }

  // Content Optimization
  async optimizeImage(
    imageUrl: string,
    targetSize: number,
    devicePixelRatio = 1,
  ): Promise<{ url: string; estimatedSize: number }> {
    // Calculate optimal dimensions and quality for target size
    const baseWidth = 1920
    const targetWidth = Math.min(baseWidth * devicePixelRatio, 2048)

    // Start with high quality and reduce if needed
    let quality = 85
    let format: ImageTransformOptions['format'] = 'auto'

    // Estimate compression needed
    const estimatedOriginalSize = targetWidth * (targetWidth * 0.75) * 3 // Rough estimate
    const compressionRatio = targetSize / estimatedOriginalSize

    if (compressionRatio < 0.3) {
      quality = 60
      format = 'webp'
    } else if (compressionRatio < 0.6) {
      quality = 75
    }

    const optimizedUrl = this.generateOptimizedUrl(imageUrl, {
      width: targetWidth,
      quality,
      format,
      fit: 'scale-down',
      progressive: true,
      metadata: 'none',
    })

    // Estimate final size (rough calculation)
    const estimatedSize = Math.round(targetSize * 0.8) // Account for additional optimizations

    return {
      url: optimizedUrl,
      estimatedSize,
    }
  }

  async generateVideoThumbnail(
    videoUrl: string,
    timeOffset = 0,
    transformOptions: ImageTransformOptions = {},
  ): Promise<string> {
    // For video thumbnails, we'll use a different endpoint or service
    const thumbnailUrl = new URL(`${this.config.baseUrl}/video-thumbnail`)

    thumbnailUrl.searchParams.set('url', videoUrl)
    thumbnailUrl.searchParams.set('time', timeOffset.toString())

    if (transformOptions.width) {
      thumbnailUrl.searchParams.set('width', transformOptions.width.toString())
    }
    if (transformOptions.height) {
      thumbnailUrl.searchParams.set('height', transformOptions.height.toString())
    }
    if (transformOptions.quality) {
      thumbnailUrl.searchParams.set('quality', transformOptions.quality.toString())
    }

    return thumbnailUrl.toString()
  }

  // Analytics and Monitoring
  async getCDNAnalytics(
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day' | 'week' = 'day',
  ): Promise<CDNAnalytics[]> {
    if (!this.config.apiKey || !this.config.zoneId) {
      console.warn('CDN API credentials not configured, returning mock analytics')
      return []
    }

    try {
      const analyticsUrl = `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/analytics/dashboard`

      const params = new URLSearchParams({
        since: startDate.toISOString(),
        until: endDate.toISOString(),
        continuous: 'true',
      })

      const response = await fetch(`${analyticsUrl}?${params}`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error('Failed to fetch CDN analytics')
      }

      // Transform CloudFlare analytics to our format
      return this.transformAnalyticsData(result.result, granularity)
    } catch (error) {
      console.error('Failed to fetch CDN analytics:', error)
      return []
    }
  }

  private transformAnalyticsData(data: any, granularity: string): CDNAnalytics[] {
    // Transform CloudFlare analytics format to our standardized format
    const analytics: CDNAnalytics[] = []

    if (data.timeseries && data.timeseries.length > 0) {
      for (const point of data.timeseries) {
        analytics.push({
          requests: point.requests?.all || 0,
          bandwidth: point.bandwidth?.all || 0,
          cacheHitRatio: point.requests?.cached / (point.requests?.all || 1),
          responseTime: point.responseTimeAvg || 0,
          errors: point.requests?.http_status_4xx + point.requests?.http_status_5xx || 0,
          timestamp: new Date(point.since),
        })
      }
    }

    return analytics
  }

  // URL Signing and Security
  generateSignedUrl(url: string, expirationTime: Date, secretKey?: string): string {
    if (!secretKey) {
      return url // Return unsigned URL if no secret provided
    }

    const expiry = Math.floor(expirationTime.getTime() / 1000)
    const urlToSign = `${url}?expires=${expiry}`

    const signature = createHash('sha256')
      .update(urlToSign + secretKey)
      .digest('hex')
      .substring(0, 16)

    return `${urlToSign}&signature=${signature}`
  }

  validateSignedUrl(signedUrl: string, secretKey: string): { valid: boolean; expired: boolean } {
    try {
      const url = new URL(signedUrl)
      const expires = url.searchParams.get('expires')
      const signature = url.searchParams.get('signature')

      if (!expires || !signature) {
        return { valid: false, expired: false }
      }

      const expirationTime = parseInt(expires) * 1000
      const now = Date.now()

      if (now > expirationTime) {
        return { valid: false, expired: true }
      }

      // Remove signature from URL for validation
      url.searchParams.delete('signature')
      const urlToValidate = url.toString()

      const expectedSignature = createHash('sha256')
        .update(urlToValidate + secretKey)
        .digest('hex')
        .substring(0, 16)

      return {
        valid: signature === expectedSignature,
        expired: false,
      }
    } catch (error) {
      return { valid: false, expired: false }
    }
  }

  // Bandwidth Optimization
  calculateOptimalQuality(
    originalSize: number,
    targetBandwidth: number, // Mbps
    loadTimeTarget: number, // seconds
  ): number {
    const targetSizeBytes = (targetBandwidth * 1024 * 1024 * loadTimeTarget) / 8
    const compressionRatio = targetSizeBytes / originalSize

    // Map compression ratio to quality setting
    if (compressionRatio >= 0.8) return 95
    if (compressionRatio >= 0.6) return 85
    if (compressionRatio >= 0.4) return 75
    if (compressionRatio >= 0.2) return 65
    return 50
  }

  // Edge Computing Integration
  async deployEdgeFunction(
    functionName: string,
    functionCode: string,
    routes: string[],
  ): Promise<boolean> {
    // This would integrate with CloudFlare Workers or similar edge computing platform
    console.log(`Deploying edge function ${functionName} to routes:`, routes)

    // Mock implementation - in real scenario, this would deploy to CDN edge
    return true
  }

  // Health Monitoring
  async checkCDNHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'down'
    responseTime: number
    regions: Array<{ region: string; status: string; responseTime: number }>
  }> {
    const healthCheckUrl = `${this.config.baseUrl}/health`
    const startTime = Date.now()

    try {
      const response = await fetch(healthCheckUrl, {
        method: 'HEAD',
        timeout: 5000,
      } as any)

      const responseTime = Date.now() - startTime

      return {
        status: response.ok ? 'healthy' : 'degraded',
        responseTime,
        regions: [], // Would be populated with actual region data
      }
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        regions: [],
      }
    }
  }
}
