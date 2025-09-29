import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CDNService } from '../services/cdn.service.js'
import type { CDNConfig, ImageTransformOptions, CacheControl } from '../services/cdn.service.js'

// Mock fetch globally
global.fetch = vi.fn()

describe('CDNService', () => {
  let cdnService: CDNService
  let mockConfig: CDNConfig

  beforeEach(() => {
    mockConfig = {
      baseUrl: 'https://cdn.example.com',
      apiKey: 'test-api-key',
      zoneId: 'test-zone-id',
      purgeEndpoint: 'https://api.cloudflare.com/client/v4/zones/test-zone-id/purge_cache',
      transformEndpoint: 'https://cdn.example.com/cdn-cgi/image',
    }

    cdnService = new CDNService(mockConfig)
    vi.clearAllMocks()
  })

  describe('generateOptimizedUrl', () => {
    it('should generate optimized URL with transformation parameters', () => {
      const originalUrl = 'https://storage.example.com/image.jpg'
      const transformOptions: ImageTransformOptions = {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp',
        fit: 'cover',
        progressive: true,
      }

      const optimizedUrl = cdnService.generateOptimizedUrl(originalUrl, transformOptions)

      expect(optimizedUrl).toContain('cdn-cgi/image')
      expect(optimizedUrl).toContain('width=800')
      expect(optimizedUrl).toContain('height=600')
      expect(optimizedUrl).toContain('quality=85')
      expect(optimizedUrl).toContain('format=webp')
      expect(optimizedUrl).toContain('fit=cover')
      expect(optimizedUrl).toContain('progressive=true')
    })

    it('should handle cache control headers', () => {
      const originalUrl = 'https://storage.example.com/image.jpg'
      const cacheControl: CacheControl = {
        maxAge: 3600,
        public: true,
        staleWhileRevalidate: 86400,
      }

      const optimizedUrl = cdnService.generateOptimizedUrl(originalUrl, {}, cacheControl)

      expect(optimizedUrl).toContain('cache=')
    })

    it('should remove existing CDN base URL', () => {
      const originalUrl = 'https://cdn.example.com/existing/image.jpg'

      const optimizedUrl = cdnService.generateOptimizedUrl(originalUrl)

      expect(optimizedUrl).not.toContain('https://cdn.example.com/https://cdn.example.com')
    })
  })

  describe('generateResponsiveImageSet', () => {
    it('should generate responsive image set with multiple breakpoints', () => {
      const originalUrl = 'https://storage.example.com/image.jpg'
      const breakpoints = [320, 640, 1024, 1920]

      const responsiveSet = cdnService.generateResponsiveImageSet(originalUrl, breakpoints, {
        format: 'webp',
        quality: 80,
      })

      expect(responsiveSet).toHaveLength(4)

      responsiveSet.forEach((item, index) => {
        expect(item.width).toBe(breakpoints[index])
        expect(item.descriptor).toBe(`${breakpoints[index]}w`)
        expect(item.url).toContain(`width=${breakpoints[index]}`)
        expect(item.url).toContain('format=webp')
        expect(item.url).toContain('quality=80')
      })
    })

    it('should use default breakpoints when none provided', () => {
      const originalUrl = 'https://storage.example.com/image.jpg'

      const responsiveSet = cdnService.generateResponsiveImageSet(originalUrl)

      expect(responsiveSet.length).toBeGreaterThan(0)
      expect(responsiveSet[0].width).toBe(320) // First default breakpoint
    })
  })

  describe('cache management', () => {
    it('should purge cache by URLs', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const success = await cdnService.purgeCache({
        urls: ['https://cdn.example.com/image1.jpg', 'https://cdn.example.com/image2.jpg'],
      })

      expect(success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        mockConfig.purgeEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockConfig.apiKey}`,
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            urls: ['https://cdn.example.com/image1.jpg', 'https://cdn.example.com/image2.jpg'],
          }),
        }),
      )
    })

    it('should purge cache by tags', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const success = await cdnService.purgeByTags(['content', 'images'])

      expect(success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        mockConfig.purgeEndpoint,
        expect.objectContaining({
          body: JSON.stringify({ tags: ['content', 'images'] }),
        }),
      )
    })

    it('should handle purge failures gracefully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: false }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const success = await cdnService.purgeCache({ urls: ['test.jpg'] })

      expect(success).toBe(false)
    })

    it('should handle network errors during purge', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const success = await cdnService.purgeCache({ urls: ['test.jpg'] })

      expect(success).toBe(false)
    })

    it('should skip purge when credentials are missing', async () => {
      const cdnServiceWithoutCreds = new CDNService({
        baseUrl: 'https://cdn.example.com',
      })

      const success = await cdnServiceWithoutCreds.purgeCache({ urls: ['test.jpg'] })

      expect(success).toBe(false)
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('buildCacheControlHeader', () => {
    it('should build cache control header with all directives', () => {
      const cacheControl: CacheControl = {
        public: true,
        maxAge: 3600,
        sMaxAge: 7200,
        staleWhileRevalidate: 86400,
        staleIfError: 604800,
        mustRevalidate: true,
      }

      const header = cdnService.buildCacheControlHeader(cacheControl)

      expect(header).toContain('public')
      expect(header).toContain('max-age=3600')
      expect(header).toContain('s-maxage=7200')
      expect(header).toContain('stale-while-revalidate=86400')
      expect(header).toContain('stale-if-error=604800')
      expect(header).toContain('must-revalidate')
    })

    it('should handle private cache control', () => {
      const cacheControl: CacheControl = {
        private: true,
        noCache: true,
        noStore: true,
      }

      const header = cdnService.buildCacheControlHeader(cacheControl)

      expect(header).toContain('private')
      expect(header).toContain('no-cache')
      expect(header).toContain('no-store')
    })
  })

  describe('getOptimalCacheControl', () => {
    it('should return appropriate cache control for static content', () => {
      const cacheControl = cdnService.getOptimalCacheControl('static', true)

      expect(cacheControl.public).toBe(true)
      expect(cacheControl.maxAge).toBeGreaterThan(86400) // More than 1 day
      expect(cacheControl.staleWhileRevalidate).toBeDefined()
    })

    it('should return appropriate cache control for dynamic content', () => {
      const cacheControl = cdnService.getOptimalCacheControl('dynamic', true)

      expect(cacheControl.public).toBe(true)
      expect(cacheControl.maxAge).toBeLessThanOrEqual(86400) // 1 day or less
      expect(cacheControl.mustRevalidate).toBe(true)
    })

    it('should return appropriate cache control for user-generated content', () => {
      const cacheControl = cdnService.getOptimalCacheControl('user-generated', false)

      expect(cacheControl.private).toBe(true)
      expect(cacheControl.maxAge).toBeLessThanOrEqual(3600) // 1 hour or less
      expect(cacheControl.mustRevalidate).toBe(true)
    })
  })

  describe('optimizeImage', () => {
    it('should optimize image for target size', async () => {
      const imageUrl = 'https://storage.example.com/large-image.jpg'
      const targetSize = 512000 // 512KB
      const devicePixelRatio = 2

      const result = await cdnService.optimizeImage(imageUrl, targetSize, devicePixelRatio)

      expect(result.url).toContain('cdn-cgi/image')
      expect(result.url).toContain('width=')
      expect(result.url).toContain('quality=')
      expect(result.estimatedSize).toBeLessThanOrEqual(targetSize * 1.2) // Allow some tolerance
    })

    it('should adjust quality for aggressive compression', async () => {
      const imageUrl = 'https://storage.example.com/large-image.jpg'
      const targetSize = 50000 // Very small target size

      const result = await cdnService.optimizeImage(imageUrl, targetSize)

      expect(result.url).toContain('quality=60') // Should use lower quality
      expect(result.url).toContain('format=webp') // Should use efficient format
    })
  })

  describe('generateVideoThumbnail', () => {
    it('should generate video thumbnail URL', async () => {
      const videoUrl = 'https://storage.example.com/video.mp4'
      const timeOffset = 30
      const transformOptions: ImageTransformOptions = {
        width: 640,
        height: 360,
        quality: 80,
      }

      const thumbnailUrl = await cdnService.generateVideoThumbnail(
        videoUrl,
        timeOffset,
        transformOptions,
      )

      expect(thumbnailUrl).toContain('video-thumbnail')
      expect(thumbnailUrl).toContain('time=30')
      expect(thumbnailUrl).toContain('width=640')
      expect(thumbnailUrl).toContain('height=360')
      expect(thumbnailUrl).toContain('quality=80')
    })
  })

  describe('getCDNAnalytics', () => {
    it('should fetch and transform CDN analytics', async () => {
      const mockAnalyticsResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            result: {
              timeseries: [
                {
                  since: '2023-01-01T00:00:00Z',
                  requests: { all: 1000, cached: 800 },
                  bandwidth: { all: 5000000 },
                  responseTimeAvg: 150,
                  requests: {
                    http_status_4xx: 10,
                    http_status_5xx: 5,
                  },
                },
              ],
            },
          }),
      }

      vi.mocked(fetch).mockResolvedValue(mockAnalyticsResponse as any)

      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-01-02')

      const analytics = await cdnService.getCDNAnalytics(startDate, endDate)

      expect(analytics).toHaveLength(1)
      expect(analytics[0]).toMatchObject({
        requests: 1000,
        bandwidth: 5000000,
        cacheHitRatio: 0.8, // 800/1000
        responseTime: 150,
        errors: 15, // 10 + 5
        timestamp: expect.any(Date),
      })
    })

    it('should handle analytics API errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'))

      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-01-02')

      const analytics = await cdnService.getCDNAnalytics(startDate, endDate)

      expect(analytics).toEqual([])
    })

    it('should return empty array when credentials are missing', async () => {
      const cdnServiceWithoutCreds = new CDNService({
        baseUrl: 'https://cdn.example.com',
      })

      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-01-02')

      const analytics = await cdnServiceWithoutCreds.getCDNAnalytics(startDate, endDate)

      expect(analytics).toEqual([])
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('URL signing and security', () => {
    it('should generate signed URL with expiration', () => {
      const url = 'https://cdn.example.com/protected-content.jpg'
      const expirationTime = new Date(Date.now() + 3600000) // 1 hour from now
      const secretKey = 'test-secret-key'

      const signedUrl = cdnService.generateSignedUrl(url, expirationTime, secretKey)

      expect(signedUrl).toContain('expires=')
      expect(signedUrl).toContain('signature=')
      expect(signedUrl).not.toBe(url) // Should be different from original
    })

    it('should return unsigned URL when no secret provided', () => {
      const url = 'https://cdn.example.com/public-content.jpg'
      const expirationTime = new Date(Date.now() + 3600000)

      const signedUrl = cdnService.generateSignedUrl(url, expirationTime)

      expect(signedUrl).toBe(url) // Should be unchanged
    })

    it('should validate signed URL correctly', () => {
      const url = 'https://cdn.example.com/protected-content.jpg'
      const expirationTime = new Date(Date.now() + 3600000)
      const secretKey = 'test-secret-key'

      const signedUrl = cdnService.generateSignedUrl(url, expirationTime, secretKey)
      const validation = cdnService.validateSignedUrl(signedUrl, secretKey)

      expect(validation.valid).toBe(true)
      expect(validation.expired).toBe(false)
    })

    it('should detect expired signed URLs', () => {
      const url = 'https://cdn.example.com/protected-content.jpg'
      const expirationTime = new Date(Date.now() - 3600000) // 1 hour ago
      const secretKey = 'test-secret-key'

      const signedUrl = cdnService.generateSignedUrl(url, expirationTime, secretKey)
      const validation = cdnService.validateSignedUrl(signedUrl, secretKey)

      expect(validation.valid).toBe(false)
      expect(validation.expired).toBe(true)
    })

    it('should detect invalid signatures', () => {
      const url = 'https://cdn.example.com/protected-content.jpg'
      const expirationTime = new Date(Date.now() + 3600000)
      const secretKey = 'test-secret-key'
      const wrongSecretKey = 'wrong-secret-key'

      const signedUrl = cdnService.generateSignedUrl(url, expirationTime, secretKey)
      const validation = cdnService.validateSignedUrl(signedUrl, wrongSecretKey)

      expect(validation.valid).toBe(false)
      expect(validation.expired).toBe(false)
    })
  })

  describe('bandwidth optimization', () => {
    it('should calculate optimal quality for bandwidth constraints', () => {
      const originalSize = 2048000 // 2MB
      const targetBandwidth = 5 // 5 Mbps
      const loadTimeTarget = 2 // 2 seconds

      const quality = cdnService.calculateOptimalQuality(
        originalSize,
        targetBandwidth,
        loadTimeTarget,
      )

      expect(quality).toBeGreaterThanOrEqual(50)
      expect(quality).toBeLessThanOrEqual(95)
    })

    it('should return minimum quality for very low bandwidth', () => {
      const originalSize = 5120000 // 5MB
      const targetBandwidth = 0.5 // 0.5 Mbps
      const loadTimeTarget = 3 // 3 seconds

      const quality = cdnService.calculateOptimalQuality(
        originalSize,
        targetBandwidth,
        loadTimeTarget,
      )

      expect(quality).toBe(50) // Minimum quality
    })

    it('should return maximum quality for high bandwidth', () => {
      const originalSize = 1024000 // 1MB
      const targetBandwidth = 100 // 100 Mbps
      const loadTimeTarget = 1 // 1 second

      const quality = cdnService.calculateOptimalQuality(
        originalSize,
        targetBandwidth,
        loadTimeTarget,
      )

      expect(quality).toBe(95) // Maximum quality
    })
  })

  describe('health monitoring', () => {
    it('should check CDN health successfully', async () => {
      const mockResponse = {
        ok: true,
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const health = await cdnService.checkCDNHealth()

      expect(health.status).toBe('healthy')
      expect(health.responseTime).toBeGreaterThan(0)
      expect(fetch).toHaveBeenCalledWith(
        `${mockConfig.baseUrl}/health`,
        expect.objectContaining({
          method: 'HEAD',
          timeout: 5000,
        }),
      )
    })

    it('should detect degraded CDN performance', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as any)

      const health = await cdnService.checkCDNHealth()

      expect(health.status).toBe('degraded')
    })

    it('should detect CDN downtime', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'))

      const health = await cdnService.checkCDNHealth()

      expect(health.status).toBe('down')
      expect(health.responseTime).toBeGreaterThan(0)
    })
  })
})
