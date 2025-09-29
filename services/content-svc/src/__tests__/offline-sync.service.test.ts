import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OfflineSyncService } from '../services/offline-sync.service.js'
import type {
  SyncOptions,
  DeviceCapabilities,
  NetworkConditions,
} from '../services/offline-sync.service.js'

// Mock database
vi.mock('../db/connection.js', () => ({
  db: {
    query: {
      categories: {
        findMany: vi.fn(),
      },
      items: {
        findFirst: vi.fn(),
      },
    },
  },
  categories: {},
  concepts: {},
  items: {},
}))

describe('OfflineSyncService', () => {
  let offlineSyncService: OfflineSyncService
  let mockSyncOptions: SyncOptions
  let mockDeviceCapabilities: DeviceCapabilities
  let mockNetworkConditions: NetworkConditions

  beforeEach(() => {
    offlineSyncService = new OfflineSyncService()

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

    mockSyncOptions = {
      categories: ['traffic_signs', 'road_rules'],
      maxSize: 100 * 1024 * 1024, // 100MB
      priority: 'high',
      includeMedia: true,
      compressionLevel: 'medium',
      networkConditions: mockNetworkConditions,
      deviceCapabilities: mockDeviceCapabilities,
    }

    vi.clearAllMocks()
  })

  describe('generateSyncManifest', () => {
    it('should generate sync manifest with specified categories', async () => {
      const { db } = await import('../db/connection.js')

      const mockCategories = [
        {
          id: 'cat-1',
          key: 'traffic_signs',
          name: 'Traffic Signs',
          concepts: [
            {
              id: 'concept-1',
              key: 'stop_signs',
              name: 'Stop Signs',
              difficulty: 0.3,
              estimatedTime: 300,
              items: [
                {
                  id: 'item-1',
                  slug: 'stop-sign-basic',
                  title: 'Basic Stop Sign',
                  body: 'What does a stop sign mean?',
                  type: 'MULTIPLE_CHOICE',
                  difficulty: 0.3,
                  mediaAssets: [
                    {
                      mediaAsset: {
                        id: 'media-1',
                        type: 'IMAGE',
                        size: 512000,
                        filename: 'stop-sign.jpg',
                        storageUrl: 'https://storage.example.com/stop-sign.jpg',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'cat-2',
          key: 'road_rules',
          name: 'Road Rules',
          concepts: [
            {
              id: 'concept-2',
              key: 'right_of_way',
              name: 'Right of Way',
              difficulty: 0.6,
              estimatedTime: 600,
              items: [
                {
                  id: 'item-2',
                  slug: 'right-of-way-intersection',
                  title: 'Intersection Right of Way',
                  body: 'Who has right of way at an intersection?',
                  type: 'SCENARIO',
                  difficulty: 0.6,
                  mediaAssets: [],
                },
              ],
            },
          ],
        },
      ]

      vi.mocked(db.query.categories.findMany).mockResolvedValue(mockCategories)

      const manifest = await offlineSyncService.generateSyncManifest(mockSyncOptions)

      expect(manifest).toMatchObject({
        version: expect.any(String),
        timestamp: expect.any(Date),
        categories: expect.arrayContaining([
          expect.objectContaining({
            id: 'cat-1',
            key: 'traffic_signs',
            name: 'Traffic Signs',
            concepts: expect.arrayContaining([
              expect.objectContaining({
                id: 'concept-1',
                key: 'stop_signs',
                items: expect.arrayContaining([
                  expect.objectContaining({
                    id: 'item-1',
                    slug: 'stop-sign-basic',
                    mediaAssets: expect.arrayContaining([
                      expect.objectContaining({
                        id: 'media-1',
                        type: 'IMAGE',
                        size: expect.any(Number),
                        format: expect.any(String),
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

      expect(manifest.categories).toHaveLength(2)
    })

    it('should respect size limits', async () => {
      const { db } = await import('../db/connection.js')

      const largeMockCategories = [
        {
          id: 'cat-1',
          key: 'traffic_signs',
          name: 'Traffic Signs',
          concepts: [
            {
              id: 'concept-1',
              key: 'stop_signs',
              name: 'Stop Signs',
              difficulty: 0.3,
              estimatedTime: 300,
              items: Array.from({ length: 100 }, (_, i) => ({
                id: `item-${i}`,
                slug: `item-${i}`,
                title: `Item ${i}`,
                body: 'Large content body'.repeat(1000),
                type: 'MULTIPLE_CHOICE',
                difficulty: 0.3,
                mediaAssets: [
                  {
                    mediaAsset: {
                      id: `media-${i}`,
                      type: 'IMAGE',
                      size: 5120000, // 5MB each
                      filename: `image-${i}.jpg`,
                      storageUrl: `https://storage.example.com/image-${i}.jpg`,
                    },
                  },
                ],
              })),
            },
          ],
        },
      ]

      vi.mocked(db.query.categories.findMany).mockResolvedValue(largeMockCategories)

      const smallSizeOptions: SyncOptions = {
        ...mockSyncOptions,
        maxSize: 10 * 1024 * 1024, // 10MB limit
      }

      const manifest = await offlineSyncService.generateSyncManifest(smallSizeOptions)

      expect(manifest.totalSize).toBeLessThanOrEqual(smallSizeOptions.maxSize!)
    })

    it('should optimize content based on device capabilities', async () => {
      const { db } = await import('../db/connection.js')

      const lowEndDeviceCapabilities: DeviceCapabilities = {
        ...mockDeviceCapabilities,
        screenWidth: 720,
        screenHeight: 480,
        supportsWebP: false,
        supportsAVIF: false,
        isLowEndDevice: true,
      }

      const lowEndOptions: SyncOptions = {
        ...mockSyncOptions,
        deviceCapabilities: lowEndDeviceCapabilities,
        compressionLevel: 'high',
      }

      const mockCategories = [
        {
          id: 'cat-1',
          key: 'traffic_signs',
          name: 'Traffic Signs',
          concepts: [
            {
              id: 'concept-1',
              key: 'stop_signs',
              name: 'Stop Signs',
              difficulty: 0.3,
              estimatedTime: 300,
              items: [
                {
                  id: 'item-1',
                  slug: 'stop-sign-basic',
                  title: 'Basic Stop Sign',
                  body: 'What does a stop sign mean?',
                  type: 'MULTIPLE_CHOICE',
                  difficulty: 0.3,
                  mediaAssets: [
                    {
                      mediaAsset: {
                        id: 'media-1',
                        type: 'IMAGE',
                        size: 2048000, // 2MB original
                        filename: 'stop-sign.jpg',
                        storageUrl: 'https://storage.example.com/stop-sign.jpg',
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

      const manifest = await offlineSyncService.generateSyncManifest(lowEndOptions)

      // Should have smaller total size due to aggressive compression
      const mediaAsset = manifest.categories[0].concepts[0].items[0].mediaAssets[0]
      expect(mediaAsset.size).toBeLessThan(2048000 * 0.5) // At least 50% reduction
      expect(mediaAsset.format).toBe('jpeg') // Should fallback to JPEG
    })

    it('should calculate appropriate sync time based on network conditions', async () => {
      const { db } = await import('../db/connection.js')

      const slowNetworkConditions: NetworkConditions = {
        effectiveType: 'slow-2g',
        downlink: 0.1,
        rtt: 500,
        saveData: true,
      }

      const slowNetworkOptions: SyncOptions = {
        ...mockSyncOptions,
        networkConditions: slowNetworkConditions,
      }

      const mockCategories = [
        {
          id: 'cat-1',
          key: 'traffic_signs',
          name: 'Traffic Signs',
          concepts: [
            {
              id: 'concept-1',
              key: 'stop_signs',
              name: 'Stop Signs',
              difficulty: 0.3,
              estimatedTime: 300,
              items: [
                {
                  id: 'item-1',
                  slug: 'stop-sign-basic',
                  title: 'Basic Stop Sign',
                  body: 'What does a stop sign mean?',
                  type: 'MULTIPLE_CHOICE',
                  difficulty: 0.3,
                  mediaAssets: [],
                },
              ],
            },
          ],
        },
      ]

      vi.mocked(db.query.categories.findMany).mockResolvedValue(mockCategories)

      const manifest = await offlineSyncService.generateSyncManifest(slowNetworkOptions)

      // Should have longer estimated sync time for slow network
      expect(manifest.estimatedSyncTime).toBeGreaterThan(1000) // At least 1 second
    })
  })

  describe('syncContent', () => {
    it('should sync content and call progress callback', async () => {
      const mockManifest = {
        version: '1.0.0',
        timestamp: new Date(),
        categories: [
          {
            id: 'cat-1',
            key: 'traffic_signs',
            name: 'Traffic Signs',
            concepts: [
              {
                id: 'concept-1',
                key: 'stop_signs',
                name: 'Stop Signs',
                items: [
                  {
                    id: 'item-1',
                    slug: 'stop-sign-basic',
                    title: 'Basic Stop Sign',
                    body: 'What does a stop sign mean?',
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 0.3,
                    mediaAssets: [
                      {
                        id: 'media-1',
                        url: 'https://storage.example.com/stop-sign.jpg',
                        optimizedUrl: 'https://cdn.example.com/stop-sign.webp',
                        type: 'IMAGE',
                        size: 256000,
                        format: 'webp',
                        checksum: 'abc123',
                      },
                    ],
                    size: 300000,
                    offline: true,
                  },
                ],
                size: 300000,
                difficulty: 0.3,
                estimatedTime: 300,
              },
            ],
            size: 300000,
            priority: 8,
          },
        ],
        totalSize: 300000,
        estimatedSyncTime: 5000,
        priority: 'high' as const,
      }

      const progressCallback = vi.fn()

      const offlineContent = await offlineSyncService.syncContent(mockManifest, progressCallback)

      expect(offlineContent).toMatchObject({
        manifest: mockManifest,
        lastSync: expect.any(Date),
        expiresAt: expect.any(Date),
        size: expect.any(Number),
        items: expect.any(Map),
        mediaAssets: expect.any(Map),
      })

      expect(offlineContent.items.size).toBe(1)
      expect(offlineContent.mediaAssets.size).toBe(1)
      expect(progressCallback).toHaveBeenCalled()

      // Check final progress callback
      const finalProgress = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0]
      expect(finalProgress.status).toBe('completed')
      expect(finalProgress.completedItems).toBe(1)
    })

    it('should handle sync pause and resume', async () => {
      const mockManifest = {
        version: '1.0.0',
        timestamp: new Date(),
        categories: [
          {
            id: 'cat-1',
            key: 'traffic_signs',
            name: 'Traffic Signs',
            concepts: [
              {
                id: 'concept-1',
                key: 'stop_signs',
                name: 'Stop Signs',
                items: [
                  {
                    id: 'item-1',
                    slug: 'item-1',
                    title: 'Item 1',
                    body: 'Content 1',
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 0.3,
                    mediaAssets: [],
                    size: 1000,
                    offline: true,
                  },
                  {
                    id: 'item-2',
                    slug: 'item-2',
                    title: 'Item 2',
                    body: 'Content 2',
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 0.3,
                    mediaAssets: [],
                    size: 1000,
                    offline: true,
                  },
                ],
                size: 2000,
                difficulty: 0.3,
                estimatedTime: 300,
              },
            ],
            size: 2000,
            priority: 8,
          },
        ],
        totalSize: 2000,
        estimatedSyncTime: 1000,
        priority: 'high' as const,
      }

      // Start sync in background
      const syncPromise = offlineSyncService.syncContent(mockManifest)

      // Pause after a short delay
      setTimeout(() => {
        offlineSyncService.pauseSync()

        // Resume after another delay
        setTimeout(() => {
          offlineSyncService.resumeSync()
        }, 100)
      }, 50)

      const offlineContent = await syncPromise

      expect(offlineContent.items.size).toBe(2)
    })

    it('should handle sync cancellation', async () => {
      const mockManifest = {
        version: '1.0.0',
        timestamp: new Date(),
        categories: [
          {
            id: 'cat-1',
            key: 'traffic_signs',
            name: 'Traffic Signs',
            concepts: [
              {
                id: 'concept-1',
                key: 'stop_signs',
                name: 'Stop Signs',
                items: [
                  {
                    id: 'item-1',
                    slug: 'item-1',
                    title: 'Item 1',
                    body: 'Content 1',
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 0.3,
                    mediaAssets: [],
                    size: 1000,
                    offline: true,
                  },
                ],
                size: 1000,
                difficulty: 0.3,
                estimatedTime: 300,
              },
            ],
            size: 1000,
            priority: 8,
          },
        ],
        totalSize: 1000,
        estimatedSyncTime: 1000,
        priority: 'high' as const,
      }

      // Start sync and immediately cancel
      const syncPromise = offlineSyncService.syncContent(mockManifest)

      setTimeout(() => {
        offlineSyncService.cancelSync()
      }, 10)

      await expect(syncPromise).rejects.toThrow('Sync cancelled')
    })
  })

  describe('incrementalSync', () => {
    it('should perform incremental sync with changes', async () => {
      const oldManifest = {
        version: '1.0.0',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        categories: [
          {
            id: 'cat-1',
            key: 'traffic_signs',
            name: 'Traffic Signs',
            concepts: [
              {
                id: 'concept-1',
                key: 'stop_signs',
                name: 'Stop Signs',
                items: [
                  {
                    id: 'item-1',
                    slug: 'item-1',
                    title: 'Old Item 1',
                    body: 'Old content',
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 0.3,
                    mediaAssets: [],
                    size: 1000,
                    offline: true,
                  },
                ],
                size: 1000,
                difficulty: 0.3,
                estimatedTime: 300,
              },
            ],
            size: 1000,
            priority: 8,
          },
        ],
        totalSize: 1000,
        estimatedSyncTime: 1000,
        priority: 'high' as const,
      }

      const existingContent = {
        manifest: oldManifest,
        lastSync: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() + 86400000),
        size: 1000,
        items: new Map([['item-1', oldManifest.categories[0].concepts[0].items[0]]]),
        mediaAssets: new Map(),
      }

      const { db } = await import('../db/connection.js')

      const newMockCategories = [
        {
          id: 'cat-1',
          key: 'traffic_signs',
          name: 'Traffic Signs',
          concepts: [
            {
              id: 'concept-1',
              key: 'stop_signs',
              name: 'Stop Signs',
              difficulty: 0.3,
              estimatedTime: 300,
              items: [
                {
                  id: 'item-1',
                  slug: 'item-1',
                  title: 'Updated Item 1', // Changed title
                  body: 'Updated content',
                  type: 'MULTIPLE_CHOICE',
                  difficulty: 0.3,
                  mediaAssets: [],
                },
                {
                  id: 'item-2', // New item
                  slug: 'item-2',
                  title: 'New Item 2',
                  body: 'New content',
                  type: 'MULTIPLE_CHOICE',
                  difficulty: 0.4,
                  mediaAssets: [],
                },
              ],
            },
          ],
        },
      ]

      vi.mocked(db.query.categories.findMany).mockResolvedValue(newMockCategories)

      const updatedContent = await offlineSyncService.incrementalSync(
        existingContent,
        mockSyncOptions,
      )

      expect(updatedContent.items.size).toBe(2) // Should have both items
      expect(updatedContent.lastSync).toBeInstanceOf(Date)
      expect(updatedContent.lastSync.getTime()).toBeGreaterThan(existingContent.lastSync.getTime())
    })

    it('should skip sync when no changes detected', async () => {
      const { db } = await import('../db/connection.js')

      const unchangedManifest = {
        version: '1.0.0',
        timestamp: new Date(),
        categories: [
          {
            id: 'cat-1',
            key: 'traffic_signs',
            name: 'Traffic Signs',
            concepts: [
              {
                id: 'concept-1',
                key: 'stop_signs',
                name: 'Stop Signs',
                items: [
                  {
                    id: 'item-1',
                    slug: 'item-1',
                    title: 'Item 1',
                    body: 'Content 1',
                    type: 'MULTIPLE_CHOICE',
                    difficulty: 0.3,
                    mediaAssets: [],
                    size: 1000,
                    offline: true,
                  },
                ],
                size: 1000,
                difficulty: 0.3,
                estimatedTime: 300,
              },
            ],
            size: 1000,
            priority: 8,
          },
        ],
        totalSize: 1000,
        estimatedSyncTime: 1000,
        priority: 'high' as const,
      }

      const existingContent = {
        manifest: unchangedManifest,
        lastSync: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        size: 1000,
        items: new Map([['item-1', unchangedManifest.categories[0].concepts[0].items[0]]]),
        mediaAssets: new Map(),
      }

      // Return same data
      vi.mocked(db.query.categories.findMany).mockResolvedValue([
        {
          id: 'cat-1',
          key: 'traffic_signs',
          name: 'Traffic Signs',
          concepts: [
            {
              id: 'concept-1',
              key: 'stop_signs',
              name: 'Stop Signs',
              difficulty: 0.3,
              estimatedTime: 300,
              items: [
                {
                  id: 'item-1',
                  slug: 'item-1',
                  title: 'Item 1',
                  body: 'Content 1',
                  type: 'MULTIPLE_CHOICE',
                  difficulty: 0.3,
                  mediaAssets: [],
                },
              ],
            },
          ],
        },
      ])

      const result = await offlineSyncService.incrementalSync(existingContent, mockSyncOptions)

      // Should return the same content object
      expect(result).toBe(existingContent)
    })
  })

  describe('validateOfflineContent', () => {
    it('should validate content successfully', async () => {
      const { db } = await import('../db/connection.js')

      const validContent = {
        manifest: {
          version: '1.0.0',
          timestamp: new Date(),
          categories: [],
          totalSize: 1000,
          estimatedSyncTime: 1000,
          priority: 'high' as const,
        },
        lastSync: new Date(),
        expiresAt: new Date(Date.now() + 86400000), // Not expired
        size: 1000,
        items: new Map([
          [
            'item-1',
            {
              id: 'item-1',
              slug: 'item-1',
              title: 'Item 1',
              body: 'Content 1',
              type: 'MULTIPLE_CHOICE',
              difficulty: 0.3,
              mediaAssets: [
                {
                  id: 'media-1',
                  url: 'https://example.com/media1.jpg',
                  optimizedUrl: 'https://cdn.example.com/media1.webp',
                  type: 'IMAGE',
                  size: 256000,
                  format: 'webp',
                  checksum: 'abc123',
                },
              ],
              size: 300000,
              offline: true,
            },
          ],
        ]),
        mediaAssets: new Map([
          [
            'media-1',
            {
              id: 'media-1',
              url: 'https://example.com/media1.jpg',
              optimizedUrl: 'https://cdn.example.com/media1.webp',
              type: 'IMAGE',
              size: 256000,
              format: 'webp',
              checksum: 'abc123',
            },
          ],
        ]),
      }

      // Mock database to return existing item
      vi.mocked(db.query.items.findFirst).mockResolvedValue({
        id: 'item-1',
        updatedAt: new Date(validContent.lastSync.getTime() - 3600000), // Updated before last sync
      })

      const validation = await offlineSyncService.validateOfflineContent(validContent)

      expect(validation.valid).toBe(true)
      expect(validation.issues).toHaveLength(0)
    })

    it('should detect expired content', async () => {
      const expiredContent = {
        manifest: {
          version: '1.0.0',
          timestamp: new Date(),
          categories: [],
          totalSize: 1000,
          estimatedSyncTime: 1000,
          priority: 'high' as const,
        },
        lastSync: new Date(),
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        size: 1000,
        items: new Map(),
        mediaAssets: new Map(),
      }

      const validation = await offlineSyncService.validateOfflineContent(expiredContent)

      expect(validation.valid).toBe(false)
      expect(validation.issues).toContainEqual(
        expect.objectContaining({
          type: 'expired',
          message: expect.stringContaining('Content expired'),
        }),
      )
    })

    it('should detect missing items', async () => {
      const { db } = await import('../db/connection.js')

      const contentWithMissingItem = {
        manifest: {
          version: '1.0.0',
          timestamp: new Date(),
          categories: [],
          totalSize: 1000,
          estimatedSyncTime: 1000,
          priority: 'high' as const,
        },
        lastSync: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        size: 1000,
        items: new Map([
          [
            'item-1',
            {
              id: 'item-1',
              slug: 'item-1',
              title: 'Item 1',
              body: 'Content 1',
              type: 'MULTIPLE_CHOICE',
              difficulty: 0.3,
              mediaAssets: [],
              size: 1000,
              offline: true,
            },
          ],
        ]),
        mediaAssets: new Map(),
      }

      // Mock database to return null (item not found)
      vi.mocked(db.query.items.findFirst).mockResolvedValue(null)

      const validation = await offlineSyncService.validateOfflineContent(contentWithMissingItem)

      expect(validation.valid).toBe(false)
      expect(validation.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing',
          itemId: 'item-1',
          message: expect.stringContaining('no longer exists'),
        }),
      )
    })

    it('should detect outdated items', async () => {
      const { db } = await import('../db/connection.js')

      const lastSync = new Date()
      const contentWithOutdatedItem = {
        manifest: {
          version: '1.0.0',
          timestamp: new Date(),
          categories: [],
          totalSize: 1000,
          estimatedSyncTime: 1000,
          priority: 'high' as const,
        },
        lastSync,
        expiresAt: new Date(Date.now() + 86400000),
        size: 1000,
        items: new Map([
          [
            'item-1',
            {
              id: 'item-1',
              slug: 'item-1',
              title: 'Item 1',
              body: 'Content 1',
              type: 'MULTIPLE_CHOICE',
              difficulty: 0.3,
              mediaAssets: [],
              size: 1000,
              offline: true,
            },
          ],
        ]),
        mediaAssets: new Map(),
      }

      // Mock database to return item updated after last sync
      vi.mocked(db.query.items.findFirst).mockResolvedValue({
        id: 'item-1',
        updatedAt: new Date(lastSync.getTime() + 3600000), // Updated 1 hour after last sync
      })

      const validation = await offlineSyncService.validateOfflineContent(contentWithOutdatedItem)

      expect(validation.valid).toBe(false)
      expect(validation.issues).toContainEqual(
        expect.objectContaining({
          type: 'expired',
          itemId: 'item-1',
          message: expect.stringContaining('has been updated since last sync'),
        }),
      )
    })
  })

  describe('sync control', () => {
    it('should provide sync progress', () => {
      const progress = offlineSyncService.getSyncProgress()

      expect(progress).toMatchObject({
        totalItems: expect.any(Number),
        completedItems: expect.any(Number),
        totalSize: expect.any(Number),
        downloadedSize: expect.any(Number),
        estimatedTimeRemaining: expect.any(Number),
        speed: expect.any(Number),
        status: expect.any(String),
      })
    })

    it('should handle pause and resume', () => {
      // Initial state should be idle
      expect(offlineSyncService.getSyncProgress().status).toBe('idle')

      // Pause should only work when syncing
      offlineSyncService.pauseSync()
      expect(offlineSyncService.getSyncProgress().status).toBe('idle')

      // Resume should only work when paused
      offlineSyncService.resumeSync()
      expect(offlineSyncService.getSyncProgress().status).toBe('idle')
    })

    it('should handle cancellation', () => {
      offlineSyncService.cancelSync()

      const progress = offlineSyncService.getSyncProgress()
      expect(progress.status).toBe('error')
      expect(progress.error).toBe('Sync cancelled by user')
    })
  })
})
