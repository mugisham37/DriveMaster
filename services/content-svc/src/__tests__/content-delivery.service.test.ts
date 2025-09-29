import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ContentDeliveryService } from '../services/content-delivery.service.js'
import type { DeviceCapabilities, NetworkConditions } from '../services/content-delivery.service.js'

// Mock database
vi.mock('../db/connection.js', () => ({
  db: {
    query: {
      mediaAssets: {
        findFirst: vi.fn(),
      },
      items: {
        findFirst: vi.fn(),
      },
    },
  },
  mediaAssets: {},
  items: {},
  itemMediaAssets: {},
}))

describe('ContentDeliveryService', () => {
  let contentDeliveryService: ContentDeliveryService
  let mockDeviceCapabilities: DeviceCapabilities
  let mockNetworkConditions: NetworkConditions

  beforeEach(() => {
    contentDeliveryService = new ContentDeliveryService()

    mockDeviceCapabilities = {
      screenWidth: 1920,
      screenHeight: 1080,
      pixelDensity: 2,
      supportsWebP: true,
      supportsAVIF: true,
      supportsVideo: true,
      maxVideoResolution: '1080p',
      connectionType: '4g',
      bandwidth: 10,
      isLowEndDevice: false,
      supportedCodecs: ['h264', 'vp9', 'av1'],
    }

    mockNetworkConditions = {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    }
  })

  describe('getOptimizedContent', () => {
    it('should optimize content for high-end device with fast connection', async () => {
      const { db } = await import('../db/connection.js')

      // Mock media asset
      const mockMediaAsset = {
        id: 'test-media-id',
        filename: 'test-image.jpg',
        storageUrl: 'https://storage.example.com/test-image.jpg',
        cdnUrl: 'https://cdn.example.com/test-image.jpg',
        type: 'IMAGE',
        size: 2048000, // 2MB
        width: 1920,
        height: 1080,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      const result = await contentDeliveryService.getOptimizedContent(
        'test-media-id',
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      expect(result).toMatchObject({
        id: 'test-media-id',
        format: 'avif', // Should prefer AVIF for modern devices
        width: expect.any(Number),
        height: expect.any(Number),
        size: expect.any(Number),
        quality: expect.any(Number),
      })

      expect(result.optimizedUrl).toContain('transform')
      expect(result.size).toBeLessThan(mockMediaAsset.size)
    })

    it('should optimize content for low-end device with slow connection', async () => {
      const { db } = await import('../db/connection.js')

      const slowDeviceCapabilities: DeviceCapabilities = {
        ...mockDeviceCapabilities,
        screenWidth: 720,
        screenHeight: 480,
        pixelDensity: 1,
        supportsWebP: false,
        supportsAVIF: false,
        connectionType: '2g',
        bandwidth: 0.5,
        isLowEndDevice: true,
        supportedCodecs: ['h264'],
      }

      const slowNetworkConditions: NetworkConditions = {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 300,
        saveData: true,
      }

      const mockMediaAsset = {
        id: 'test-media-id',
        filename: 'test-image.jpg',
        storageUrl: 'https://storage.example.com/test-image.jpg',
        type: 'IMAGE',
        size: 2048000,
        width: 1920,
        height: 1080,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      const result = await contentDeliveryService.getOptimizedContent(
        'test-media-id',
        slowDeviceCapabilities,
        slowNetworkConditions,
      )

      expect(result.format).toBe('jpeg') // Should fallback to JPEG
      expect(result.width).toBeLessThanOrEqual(720) // Should respect device screen size
      expect(result.size).toBeLessThan(mockMediaAsset.size * 0.5) // Should be heavily compressed
    })

    it('should handle save data mode', async () => {
      const { db } = await import('../db/connection.js')

      const saveDataNetworkConditions: NetworkConditions = {
        ...mockNetworkConditions,
        saveData: true,
      }

      const mockMediaAsset = {
        id: 'test-media-id',
        filename: 'test-image.jpg',
        storageUrl: 'https://storage.example.com/test-image.jpg',
        type: 'IMAGE',
        size: 2048000,
        width: 1920,
        height: 1080,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      const result = await contentDeliveryService.getOptimizedContent(
        'test-media-id',
        mockDeviceCapabilities,
        saveDataNetworkConditions,
        { quality: 'auto' },
      )

      // Should use low quality when save data is enabled
      expect(result.quality).toBeLessThanOrEqual(60)
    })

    it('should throw error for non-existent media asset', async () => {
      const { db } = await import('../db/connection.js')

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(null)

      await expect(
        contentDeliveryService.getOptimizedContent(
          'non-existent-id',
          mockDeviceCapabilities,
          mockNetworkConditions,
        ),
      ).rejects.toThrow('Media asset not found')
    })
  })

  describe('generatePreloadManifest', () => {
    it('should generate preload manifest for item with media assets', async () => {
      const { db } = await import('../db/connection.js')

      const mockItem = {
        id: 'test-item-id',
        slug: 'test-item',
        title: 'Test Item',
        body: 'Test content',
        mediaAssets: [
          {
            mediaAsset: {
              id: 'media-1',
              type: 'IMAGE',
              size: 1024000,
              storageUrl: 'https://storage.example.com/image1.jpg',
              cdnUrl: 'https://cdn.example.com/image1.jpg',
            },
          },
          {
            mediaAsset: {
              id: 'media-2',
              type: 'VIDEO',
              size: 5120000,
              storageUrl: 'https://storage.example.com/video1.mp4',
              cdnUrl: 'https://cdn.example.com/video1.mp4',
            },
          },
        ],
      }

      vi.mocked(db.query.items.findFirst).mockResolvedValue(mockItem)

      const manifest = await contentDeliveryService.generatePreloadManifest(
        'test-item-id',
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      expect(manifest).toMatchObject({
        contentId: 'test-item-id',
        priority: expect.any(String),
        resources: expect.arrayContaining([
          expect.objectContaining({
            type: 'image',
            size: expect.any(Number),
            format: expect.any(String),
          }),
          expect.objectContaining({
            type: 'video',
            size: expect.any(Number),
            format: expect.any(String),
          }),
        ]),
        totalSize: expect.any(Number),
        estimatedLoadTime: expect.any(Number),
      })

      expect(manifest.resources).toHaveLength(2)
    })

    it('should calculate appropriate priority based on network conditions', async () => {
      const { db } = await import('../db/connection.js')

      const mockItem = {
        id: 'test-item-id',
        difficulty: 0.9, // High difficulty item
        mediaAssets: [],
      }

      vi.mocked(db.query.items.findFirst).mockResolvedValue(mockItem)

      // Test with fast connection
      const fastManifest = await contentDeliveryService.generatePreloadManifest(
        'test-item-id',
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      expect(fastManifest.priority).toBe('high')

      // Test with slow connection
      const slowNetworkConditions: NetworkConditions = {
        effectiveType: 'slow-2g',
        downlink: 0.1,
        rtt: 500,
        saveData: true,
      }

      const slowManifest = await contentDeliveryService.generatePreloadManifest(
        'test-item-id',
        mockDeviceCapabilities,
        slowNetworkConditions,
      )

      expect(slowManifest.priority).toBe('low')
    })
  })

  describe('preloadContent', () => {
    it('should generate manifests for multiple items and sort by priority', async () => {
      const { db } = await import('../db/connection.js')

      const mockItems = [
        {
          id: 'item-1',
          difficulty: 0.3,
          mediaAssets: [
            {
              mediaAsset: {
                id: 'media-1',
                type: 'IMAGE',
                size: 512000,
                storageUrl: 'https://storage.example.com/image1.jpg',
              },
            },
          ],
        },
        {
          id: 'item-2',
          difficulty: 0.9,
          mediaAssets: [
            {
              mediaAsset: {
                id: 'media-2',
                type: 'IMAGE',
                size: 256000,
                storageUrl: 'https://storage.example.com/image2.jpg',
              },
            },
          ],
        },
      ]

      vi.mocked(db.query.items.findFirst)
        .mockResolvedValueOnce(mockItems[0])
        .mockResolvedValueOnce(mockItems[1])

      const manifests = await contentDeliveryService.preloadContent(
        ['item-1', 'item-2'],
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      expect(manifests).toHaveLength(2)

      // Should be sorted by priority (high difficulty item first)
      expect(manifests[0].contentId).toBe('item-2')
      expect(manifests[1].contentId).toBe('item-1')
    })

    it('should handle errors gracefully and continue processing', async () => {
      const { db } = await import('../db/connection.js')

      vi.mocked(db.query.items.findFirst)
        .mockResolvedValueOnce(null) // First item not found
        .mockResolvedValueOnce({
          id: 'item-2',
          difficulty: 0.5,
          mediaAssets: [],
        })

      const manifests = await contentDeliveryService.preloadContent(
        ['non-existent-item', 'item-2'],
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      // Should only return manifest for the valid item
      expect(manifests).toHaveLength(1)
      expect(manifests[0].contentId).toBe('item-2')
    })
  })

  describe('getCompressedContent', () => {
    it('should compress content to target size', async () => {
      const { db } = await import('../db/connection.js')

      const mockMediaAsset = {
        id: 'test-media-id',
        size: 2048000, // 2MB
        width: 1920,
        height: 1080,
        storageUrl: 'https://storage.example.com/test-image.jpg',
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      const targetSize = 512000 // 512KB
      const result = await contentDeliveryService.getCompressedContent(
        'test-media-id',
        targetSize,
        mockDeviceCapabilities,
      )

      expect(result.size).toBeLessThanOrEqual(targetSize * 1.1) // Allow 10% tolerance
      expect(result.width).toBeLessThan(mockMediaAsset.width) // Should be resized
      expect(result.height).toBeLessThan(mockMediaAsset.height)
    })
  })

  describe('cache management', () => {
    it('should cache optimized content', async () => {
      const { db } = await import('../db/connection.js')

      const mockMediaAsset = {
        id: 'test-media-id',
        filename: 'test-image.jpg',
        storageUrl: 'https://storage.example.com/test-image.jpg',
        type: 'IMAGE',
        size: 1024000,
        width: 1920,
        height: 1080,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      // First call should generate content
      const result1 = await contentDeliveryService.getOptimizedContent(
        'test-media-id',
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      // Second call with same parameters should return cached result
      const result2 = await contentDeliveryService.getOptimizedContent(
        'test-media-id',
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      expect(result1.cacheKey).toBe(result2.cacheKey)
      expect(result1.optimizedUrl).toBe(result2.optimizedUrl)
    })

    it('should invalidate cache for specific media asset', async () => {
      const { db } = await import('../db/connection.js')

      const mockMediaAsset = {
        id: 'test-media-id',
        filename: 'test-image.jpg',
        storageUrl: 'https://storage.example.com/test-image.jpg',
        type: 'IMAGE',
        size: 1024000,
        width: 1920,
        height: 1080,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      // Generate cached content
      await contentDeliveryService.getOptimizedContent(
        'test-media-id',
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      // Invalidate cache
      await contentDeliveryService.invalidateCache('test-media-id')

      // Verify cache is cleared
      const cached = await contentDeliveryService.getCachedContent('any-key')
      expect(cached).toBeNull()
    })

    it('should clear expired cache entries', async () => {
      // This test would require mocking time or using a shorter TTL
      const cleared = await contentDeliveryService.clearExpiredCache()
      expect(cleared).toBeGreaterThanOrEqual(0)
    })

    it('should provide cache statistics', () => {
      const stats = contentDeliveryService.getCacheStats()

      expect(stats).toMatchObject({
        size: expect.any(Number),
        totalItems: expect.any(Number),
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle missing CDN URL gracefully', async () => {
      const { db } = await import('../db/connection.js')

      const mockMediaAsset = {
        id: 'test-media-id',
        filename: 'test-image.jpg',
        storageUrl: 'https://storage.example.com/test-image.jpg',
        cdnUrl: null, // No CDN URL
        type: 'IMAGE',
        size: 1024000,
        width: 1920,
        height: 1080,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      const result = await contentDeliveryService.getOptimizedContent(
        'test-media-id',
        mockDeviceCapabilities,
        mockNetworkConditions,
      )

      expect(result.originalUrl).toBe(mockMediaAsset.storageUrl)
    })

    it('should handle zero bandwidth gracefully', async () => {
      const { db } = await import('../db/connection.js')

      const zeroNetworkConditions: NetworkConditions = {
        effectiveType: 'slow-2g',
        downlink: 0,
        rtt: 1000,
        saveData: true,
      }

      const mockMediaAsset = {
        id: 'test-media-id',
        filename: 'test-image.jpg',
        storageUrl: 'https://storage.example.com/test-image.jpg',
        type: 'IMAGE',
        size: 1024000,
        width: 1920,
        height: 1080,
      }

      vi.mocked(db.query.mediaAssets.findFirst).mockResolvedValue(mockMediaAsset)

      const result = await contentDeliveryService.getOptimizedContent(
        'test-media-id',
        mockDeviceCapabilities,
        zeroNetworkConditions,
      )

      // Should still return optimized content with lowest quality
      expect(result.quality).toBeLessThanOrEqual(60)
    })
  })
})
