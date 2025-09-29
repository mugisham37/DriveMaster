import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import Fastify from 'fastify'
import { ContentDeliveryService } from '../services/content-delivery.service.js'
import { CDNService } from '../services/cdn.service.js'
import { OfflineSyncService } from '../services/offline-sync.service.js'

// Mock database and external services
vi.mock('../db/connection.js', () => ({
  db: {
    query: {
      mediaAssets: {
        findFirst: vi.fn(),
      },
      items: {
        findFirst: vi.fn(),
      },
      categories: {
        findMany: vi.fn(),
      },
    },
  },
  mediaAssets: {},
  items: {},
  categories: {},
  concepts: {},
}))

// Mock fetch for CDN operations
global.fetch = vi.fn()

describe('Content Delivery Integration Tests', () => {
  let app: any
  let contentDeliveryService: ContentDeliveryService
  let cdnService: CDNService
  let offlineSyncService: OfflineSyncService

  beforeAll(async () => {
    // Initialize services
    contentDeliveryService = new ContentDeliveryService()
    cdnService = new CDNService({
      baseUrl: 'https://cdn.test.com',
      apiKey: 'test-key',
      zoneId: 'test-zone',
    })
    offlineSyncService = new OfflineSyncService()

    // Create Fastify app for integration testing
    app = Fastify({ logger: false })

    // Register basic routes for testing
    app.post('/media/:mediaAssetId/optimize', async (request: any, reply: any) => {
      const { mediaAssetId } = request.params
      const { deviceCapabilities, networkConditions, options = {} } = request.body

      try {
        const optimizedContent = await contentDeliveryService.getOptimizedContent(
          mediaAssetId,
          deviceCapabilities,
          networkConditions,
          options,
        )
        reply.send(optimizedContent)
      } catch (error: any) {
        reply
          .code(error.message === 'Media asset not found' ? 404 : 500)
          .send({ error: error.message })
      }
    })

    app.post('/sync/manifest', async (request: any, reply: any) => {
      try {
        const manifest = await offlineSyncService.generateSyncManifest(request.body)
        reply.send(manifest)
      } catch (error: any) {
        reply.code(500).send({ error: error.message })
      }
    })

    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('End-to-End Content Optimization', () => {
    it('should optimize content for different device types and network conditions', async () => {
      const { db } = await import('../db/connection.js')

      // Mock media asset
      const mockMediaAsset = {
        id: 'test-media-123',
        filename: 'driving-test-image.jpg',
        storageUrl: 'https://storage.test.com/driving-test-image.jpg',
        cdnUrl: 'https://cdn.test.com/driving-test-image.jpg',
        type: 'IMAGE',
        size: 2048000, // 2MB
        width: 1920,
        height: 1080,
        mimeType: 'image/jpeg',
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      // Test scenarios for different device/network combinations
      const testScenarios = [
        {
          name: 'High-end device with fast connection',
          deviceCapabilities: {
            screenWidth: 2560,
            screenHeight: 1440,
            pixelDensity: 2,
            supportsWebP: true,
            supportsAVIF: true,
            supportsVideo: true,
            maxVideoResolution: '4k' as const,
            connectionType: '5g' as const,
            bandwidth: 50,
            isLowEndDevice: false,
            supportedCodecs: ['h264', 'vp9', 'av1'],
          },
          networkConditions: {
            effectiveType: '4g' as const,
            downlink: 50,
            rtt: 20,
            saveData: false,
          },
          expectedFormat: 'avif',
          expectedQuality: 'high',
        },
        {
          name: 'Mid-range device with moderate connection',
          deviceCapabilities: {
            screenWidth: 1920,
            screenHeight: 1080,
            pixelDensity: 1.5,
            supportsWebP: true,
            supportsAVIF: false,
            supportsVideo: true,
            maxVideoResolution: '1080p' as const,
            connectionType: '4g' as const,
            bandwidth: 10,
            isLowEndDevice: false,
            supportedCodecs: ['h264', 'vp9'],
          },
          networkConditions: {
            effectiveType: '3g' as const,
            downlink: 5,
            rtt: 100,
            saveData: false,
          },
          expectedFormat: 'webp',
          expectedQuality: 'medium',
        },
        {
          name: 'Low-end device with slow connection',
          deviceCapabilities: {
            screenWidth: 720,
            screenHeight: 480,
            pixelDensity: 1,
            supportsWebP: false,
            supportsAVIF: false,
            supportsVideo: false,
            maxVideoResolution: '480p' as const,
            connectionType: '2g' as const,
            bandwidth: 0.5,
            isLowEndDevice: true,
            supportedCodecs: ['h264'],
          },
          networkConditions: {
            effectiveType: '2g' as const,
            downlink: 0.5,
            rtt: 300,
            saveData: true,
          },
          expectedFormat: 'jpeg',
          expectedQuality: 'low',
        },
      ]

      for (const scenario of testScenarios) {
        const response = await app.inject({
          method: 'POST',
          url: '/media/test-media-123/optimize',
          payload: {
            deviceCapabilities: scenario.deviceCapabilities,
            networkConditions: scenario.networkConditions,
          },
        })

        expect(response.statusCode).toBe(200)

        const result = JSON.parse(response.payload)

        expect(result).toMatchObject({
          id: 'test-media-123',
          format: scenario.expectedFormat,
          width: expect.any(Number),
          height: expect.any(Number),
          size: expect.any(Number),
          quality: expect.any(Number),
          optimizedUrl: expect.stringContaining('transform'),
        })

        // Verify size optimization
        expect(result.size).toBeLessThan(mockMediaAsset.size)

        // Verify dimensions are appropriate for device
        expect(result.width).toBeLessThanOrEqual(
          scenario.deviceCapabilities.screenWidth * scenario.deviceCapabilities.pixelDensity,
        )
        expect(result.height).toBeLessThanOrEqual(
          scenario.deviceCapabilities.screenHeight * scenario.deviceCapabilities.pixelDensity,
        )

        console.log(
          `✓ ${scenario.name}: ${result.format}, ${result.width}x${result.height}, ${Math.round(result.size / 1024)}KB`,
        )
      }
    })

    it('should handle progressive enhancement gracefully', async () => {
      const { db } = await import('../db/connection.js')

      const mockMediaAsset = {
        id: 'test-media-456',
        filename: 'traffic-sign.png',
        storageUrl: 'https://storage.test.com/traffic-sign.png',
        type: 'IMAGE',
        size: 512000,
        width: 800,
        height: 600,
        mimeType: 'image/png',
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      // Test with different format support levels
      const formatTests = [
        { supportsAVIF: true, supportsWebP: true, expected: 'avif' },
        { supportsAVIF: false, supportsWebP: true, expected: 'webp' },
        { supportsAVIF: false, supportsWebP: false, expected: 'jpeg' },
      ]

      for (const test of formatTests) {
        const response = await app.inject({
          method: 'POST',
          url: '/media/test-media-456/optimize',
          payload: {
            deviceCapabilities: {
              screenWidth: 1920,
              screenHeight: 1080,
              pixelDensity: 1,
              supportsWebP: test.supportsWebP,
              supportsAVIF: test.supportsAVIF,
              supportsVideo: true,
              maxVideoResolution: '1080p',
              connectionType: '4g',
              bandwidth: 10,
              isLowEndDevice: false,
              supportedCodecs: ['h264'],
            },
            networkConditions: {
              effectiveType: '4g',
              downlink: 10,
              rtt: 50,
              saveData: false,
            },
          },
        })

        expect(response.statusCode).toBe(200)

        const result = JSON.parse(response.payload)
        expect(result.format).toBe(test.expected)
      }
    })
  })

  describe('Offline Sync Integration', () => {
    it('should generate comprehensive sync manifest', async () => {
      const { db } = await import('../db/connection.js')

      // Mock categories with nested structure
      const mockCategories = [
        {
          id: 'cat-traffic-signs',
          key: 'traffic_signs',
          name: 'Traffic Signs',
          concepts: [
            {
              id: 'concept-stop-signs',
              key: 'stop_signs',
              name: 'Stop Signs',
              difficulty: 0.3,
              estimatedTime: 300,
              items: [
                {
                  id: 'item-stop-basic',
                  slug: 'stop-sign-basic',
                  title: 'Basic Stop Sign Recognition',
                  body: 'Identify the meaning of a standard stop sign',
                  type: 'MULTIPLE_CHOICE',
                  difficulty: 0.2,
                  mediaAssets: [
                    {
                      mediaAsset: {
                        id: 'media-stop-sign',
                        type: 'IMAGE',
                        size: 256000,
                        filename: 'stop-sign.jpg',
                        storageUrl: 'https://storage.test.com/stop-sign.jpg',
                        cdnUrl: 'https://cdn.test.com/stop-sign.jpg',
                        width: 400,
                        height: 400,
                      },
                    },
                  ],
                },
                {
                  id: 'item-stop-intersection',
                  slug: 'stop-sign-intersection',
                  title: 'Stop Sign at Intersection',
                  body: 'How to properly stop at an intersection with a stop sign',
                  type: 'SCENARIO',
                  difficulty: 0.4,
                  mediaAssets: [
                    {
                      mediaAsset: {
                        id: 'media-intersection-video',
                        type: 'VIDEO',
                        size: 5120000,
                        filename: 'intersection-stop.mp4',
                        storageUrl: 'https://storage.test.com/intersection-stop.mp4',
                        cdnUrl: 'https://cdn.test.com/intersection-stop.mp4',
                        width: 1280,
                        height: 720,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'cat-road-rules',
          key: 'road_rules',
          name: 'Road Rules',
          concepts: [
            {
              id: 'concept-right-of-way',
              key: 'right_of_way',
              name: 'Right of Way',
              difficulty: 0.6,
              estimatedTime: 600,
              items: [
                {
                  id: 'item-intersection-priority',
                  slug: 'intersection-priority',
                  title: 'Intersection Priority Rules',
                  body: 'Determine who has right of way at various intersection types',
                  type: 'INTERACTIVE',
                  difficulty: 0.7,
                  mediaAssets: [
                    {
                      mediaAsset: {
                        id: 'media-intersection-diagram',
                        type: 'SIMULATION',
                        size: 1024000,
                        filename: 'intersection-sim.html',
                        storageUrl: 'https://storage.test.com/intersection-sim.html',
                        width: 800,
                        height: 600,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]

      vi.mocked(db.query.categories.findMany).mockResolvedValue(mockCategories)

      const syncOptions = {
        categories: ['traffic_signs', 'road_rules'],
        maxSize: 50 * 1024 * 1024, // 50MB
        priority: 'high' as const,
        includeMedia: true,
        compressionLevel: 'medium' as const,
        networkConditions: {
          effectiveType: '4g' as const,
          downlink: 10,
          rtt: 50,
          saveData: false,
        },
        deviceCapabilities: {
          screenWidth: 1920,
          screenHeight: 1080,
          pixelDensity: 2,
          supportsWebP: true,
          supportsAVIF: true,
          supportsVideo: true,
          maxVideoResolution: '1080p' as const,
          connectionType: '4g' as const,
          bandwidth: 10,
          isLowEndDevice: false,
          supportedCodecs: ['h264', 'vp9'],
        },
      }

      const response = await app.inject({
        method: 'POST',
        url: '/sync/manifest',
        payload: syncOptions,
      })

      expect(response.statusCode).toBe(200)

      const manifest = JSON.parse(response.payload)

      expect(manifest).toMatchObject({
        version: expect.any(String),
        timestamp: expect.any(String),
        categories: expect.arrayContaining([
          expect.objectContaining({
            key: 'traffic_signs',
            name: 'Traffic Signs',
            concepts: expect.arrayContaining([
              expect.objectContaining({
                key: 'stop_signs',
                items: expect.arrayContaining([
                  expect.objectContaining({
                    id: 'item-stop-basic',
                    mediaAssets: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'media-stop-sign',
                        type: 'IMAGE',
                        format: expect.any(String),
                        size: expect.any(Number),
                      }),
                    ]),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
        totalSize: expect.any(Number),
        estimatedSyncTime: expect.any(Number),
        priority: 'high',
      })

      // Verify content structure
      expect(manifest.categories).toHaveLength(2)

      const trafficSignsCategory = manifest.categories.find(
        (cat: any) => cat.key === 'traffic_signs',
      )
      expect(trafficSignsCategory.concepts).toHaveLength(1)
      expect(trafficSignsCategory.concepts[0].items).toHaveLength(2)

      // Verify media optimization
      const stopSignItem = trafficSignsCategory.concepts[0].items.find(
        (item: any) => item.id === 'item-stop-basic',
      )
      expect(stopSignItem.mediaAssets[0].format).toBe('avif') // Should use best format
      expect(stopSignItem.mediaAssets[0].size).toBeLessThan(256000) // Should be compressed

      console.log(
        `Generated sync manifest: ${manifest.categories.length} categories, ${Math.round(manifest.totalSize / 1024 / 1024)}MB, ${Math.round(manifest.estimatedSyncTime / 1000)}s`,
      )
    })

    it('should handle size constraints appropriately', async () => {
      const { db } = await import('../db/connection.js')

      // Create large content that exceeds size limit
      const largeContent = Array.from({ length: 50 }, (_, i) => ({
        id: `item-${i}`,
        slug: `large-item-${i}`,
        title: `Large Item ${i}`,
        body: 'Large content body '.repeat(100),
        type: 'MULTIPLE_CHOICE',
        difficulty: 0.5,
        mediaAssets: [
          {
            mediaAsset: {
              id: `media-${i}`,
              type: 'IMAGE',
              size: 2048000, // 2MB each
              filename: `large-image-${i}.jpg`,
              storageUrl: `https://storage.test.com/large-image-${i}.jpg`,
              width: 1920,
              height: 1080,
            },
          },
        ],
      }))

      const mockCategories = [
        {
          id: 'cat-large',
          key: 'large_content',
          name: 'Large Content',
          concepts: [
            {
              id: 'concept-large',
              key: 'large_concept',
              name: 'Large Concept',
              difficulty: 0.5,
              estimatedTime: 1800,
              items: largeContent,
            },
          ],
        },
      ]

      vi.mocked(db.query.categories.findMany).mockResolvedValue(mockCategories)

      const syncOptions = {
        categories: ['large_content'],
        maxSize: 10 * 1024 * 1024, // 10MB limit
        priority: 'medium' as const,
        includeMedia: true,
        compressionLevel: 'high' as const,
        networkConditions: {
          effectiveType: '3g' as const,
          downlink: 2,
          rtt: 150,
          saveData: true,
        },
        deviceCapabilities: {
          screenWidth: 720,
          screenHeight: 480,
          pixelDensity: 1,
          supportsWebP: false,
          supportsAVIF: false,
          supportsVideo: false,
          maxVideoResolution: '480p' as const,
          connectionType: '3g' as const,
          bandwidth: 2,
          isLowEndDevice: true,
          supportedCodecs: ['h264'],
        },
      }

      const response = await app.inject({
        method: 'POST',
        url: '/sync/manifest',
        payload: syncOptions,
      })

      expect(response.statusCode).toBe(200)

      const manifest = JSON.parse(response.payload)

      // Should respect size limit
      expect(manifest.totalSize).toBeLessThanOrEqual(syncOptions.maxSize)

      // Should have fewer items due to size constraint
      const totalItems = manifest.categories.reduce(
        (sum: number, cat: any) =>
          sum +
          cat.concepts.reduce(
            (conceptSum: number, concept: any) => conceptSum + concept.items.length,
            0,
          ),
        0,
      )
      expect(totalItems).toBeLessThan(50) // Should not include all 50 items

      console.log(
        `Size-constrained manifest: ${totalItems} items, ${Math.round(manifest.totalSize / 1024 / 1024)}MB`,
      )
    })
  })

  describe('Performance Under Load', () => {
    it('should handle concurrent optimization requests efficiently', async () => {
      const { db } = await import('../db/connection.js')

      const mockMediaAsset = {
        id: 'perf-test-media',
        filename: 'performance-test.jpg',
        storageUrl: 'https://storage.test.com/performance-test.jpg',
        cdnUrl: 'https://cdn.test.com/performance-test.jpg',
        type: 'IMAGE',
        size: 1024000,
        width: 1200,
        height: 800,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      const concurrentRequests = 20
      const startTime = Date.now()

      // Create concurrent optimization requests
      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        app.inject({
          method: 'POST',
          url: '/media/perf-test-media/optimize',
          payload: {
            deviceCapabilities: {
              screenWidth: 1920,
              screenHeight: 1080,
              pixelDensity: 1 + (i % 3), // Vary pixel density
              supportsWebP: i % 2 === 0,
              supportsAVIF: i % 3 === 0,
              supportsVideo: true,
              maxVideoResolution: '1080p',
              connectionType: '4g',
              bandwidth: 10,
              isLowEndDevice: false,
              supportedCodecs: ['h264'],
            },
            networkConditions: {
              effectiveType: '4g',
              downlink: 5 + (i % 10), // Vary bandwidth
              rtt: 50,
              saveData: false,
            },
          },
        }),
      )

      const responses = await Promise.all(requests)
      const endTime = Date.now()

      // All requests should succeed
      responses.forEach((response, i) => {
        expect(response.statusCode).toBe(200)
        const result = JSON.parse(response.payload)
        expect(result.id).toBe('perf-test-media')
      })

      const totalTime = endTime - startTime
      const avgResponseTime = totalTime / concurrentRequests

      console.log(
        `Concurrent requests: ${concurrentRequests} requests in ${totalTime}ms (avg: ${avgResponseTime.toFixed(2)}ms per request)`,
      )

      // Should handle requests reasonably quickly
      expect(avgResponseTime).toBeLessThan(1000) // Less than 1 second average
    })

    it('should cache optimization results effectively', async () => {
      const { db } = await import('../db/connection.js')

      const mockMediaAsset = {
        id: 'cache-test-media',
        filename: 'cache-test.jpg',
        storageUrl: 'https://storage.test.com/cache-test.jpg',
        type: 'IMAGE',
        size: 512000,
        width: 800,
        height: 600,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      const requestPayload = {
        deviceCapabilities: {
          screenWidth: 1920,
          screenHeight: 1080,
          pixelDensity: 2,
          supportsWebP: true,
          supportsAVIF: true,
          supportsVideo: true,
          maxVideoResolution: '1080p' as const,
          connectionType: '4g' as const,
          bandwidth: 10,
          isLowEndDevice: false,
          supportedCodecs: ['h264'],
        },
        networkConditions: {
          effectiveType: '4g' as const,
          downlink: 10,
          rtt: 50,
          saveData: false,
        },
      }

      // First request (should generate content)
      const startTime1 = Date.now()
      const response1 = await app.inject({
        method: 'POST',
        url: '/media/cache-test-media/optimize',
        payload: requestPayload,
      })
      const time1 = Date.now() - startTime1

      expect(response1.statusCode).toBe(200)
      const result1 = JSON.parse(response1.payload)

      // Second identical request (should use cache)
      const startTime2 = Date.now()
      const response2 = await app.inject({
        method: 'POST',
        url: '/media/cache-test-media/optimize',
        payload: requestPayload,
      })
      const time2 = Date.now() - startTime2

      expect(response2.statusCode).toBe(200)
      const result2 = JSON.parse(response2.payload)

      // Results should be identical
      expect(result1.cacheKey).toBe(result2.cacheKey)
      expect(result1.optimizedUrl).toBe(result2.optimizedUrl)

      // Second request should be faster (cached)
      expect(time2).toBeLessThan(time1)

      console.log(
        `Cache effectiveness: First request ${time1}ms, cached request ${time2}ms (${(((time1 - time2) / time1) * 100).toFixed(1)}% faster)`,
      )
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle missing media assets gracefully', async () => {
      const { db } = await import('../db/connection.js')

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(null)

      const response = await app.inject({
        method: 'POST',
        url: '/media/non-existent-media/optimize',
        payload: {
          deviceCapabilities: {
            screenWidth: 1920,
            screenHeight: 1080,
            pixelDensity: 1,
            supportsWebP: true,
            supportsAVIF: false,
            supportsVideo: true,
            maxVideoResolution: '1080p',
            connectionType: '4g',
            bandwidth: 10,
            isLowEndDevice: false,
            supportedCodecs: ['h264'],
          },
          networkConditions: {
            effectiveType: '4g',
            downlink: 10,
            rtt: 50,
            saveData: false,
          },
        },
      })

      expect(response.statusCode).toBe(404)

      const error = JSON.parse(response.payload)
      expect(error.error).toBe('Media asset not found')
    })

    it('should handle database errors gracefully', async () => {
      const { db } = await import('../db/connection.js')

      vi.mocked(db.query.mediaAssets.findFirst).mockRejectedValue(
        new Error('Database connection failed'),
      )

      const response = await app.inject({
        method: 'POST',
        url: '/media/error-test-media/optimize',
        payload: {
          deviceCapabilities: {
            screenWidth: 1920,
            screenHeight: 1080,
            pixelDensity: 1,
            supportsWebP: true,
            supportsAVIF: false,
            supportsVideo: true,
            maxVideoResolution: '1080p',
            connectionType: '4g',
            bandwidth: 10,
            isLowEndDevice: false,
            supportedCodecs: ['h264'],
          },
          networkConditions: {
            effectiveType: '4g',
            downlink: 10,
            rtt: 50,
            saveData: false,
          },
        },
      })

      expect(response.statusCode).toBe(500)

      const error = JSON.parse(response.payload)
      expect(error.error).toBe('Internal server error')
    })

    it('should validate request parameters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/media/test-media/optimize',
        payload: {
          deviceCapabilities: {
            // Missing required fields
            screenWidth: 1920,
          },
          networkConditions: {
            // Invalid enum value
            effectiveType: 'invalid-type',
          },
        },
      })

      expect(response.statusCode).toBe(500) // Should handle validation errors
    })
  })
})
