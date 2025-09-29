import { eq, and, desc, asc, sql, inArray, gte, lte } from 'drizzle-orm'
import { db, items, mediaAssets, itemMediaAssets, concepts, categories } from '../db/connection.js'
import type {
  DeviceCapabilities,
  NetworkConditions,
  PreloadManifest,
} from './content-delivery.service.js'

export interface SyncManifest {
  version: string
  timestamp: Date
  categories: SyncCategory[]
  totalSize: number
  estimatedSyncTime: number
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export interface SyncCategory {
  id: string
  key: string
  name: string
  concepts: SyncConcept[]
  size: number
  priority: number
}

export interface SyncConcept {
  id: string
  key: string
  name: string
  items: SyncItem[]
  size: number
  difficulty: number
  estimatedTime: number
}

export interface SyncItem {
  id: string
  slug: string
  title?: string
  body: string
  type: string
  difficulty: number
  mediaAssets: SyncMediaAsset[]
  size: number
  offline: boolean
}

export interface SyncMediaAsset {
  id: string
  url: string
  optimizedUrl: string
  type: string
  size: number
  format: string
  dimensions?: { width: number; height: number }
  checksum: string
}

export interface SyncProgress {
  totalItems: number
  completedItems: number
  totalSize: number
  downloadedSize: number
  currentItem?: string
  estimatedTimeRemaining: number
  speed: number // bytes per second
  status: 'idle' | 'syncing' | 'paused' | 'completed' | 'error'
  error?: string
}

export interface SyncOptions {
  categories?: string[]
  concepts?: string[]
  maxSize?: number // Maximum total size in bytes
  priority?: 'critical' | 'high' | 'medium' | 'low'
  includeMedia?: boolean
  compressionLevel?: 'low' | 'medium' | 'high'
  networkConditions: NetworkConditions
  deviceCapabilities: DeviceCapabilities
}

export interface OfflineContent {
  manifest: SyncManifest
  lastSync: Date
  expiresAt: Date
  size: number
  items: Map<string, SyncItem>
  mediaAssets: Map<string, SyncMediaAsset>
}

export class OfflineSyncService {
  private readonly MAX_SYNC_SIZE = 500 * 1024 * 1024 // 500MB default limit
  private readonly SYNC_VERSION = '1.0.0'
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

  private syncProgress: SyncProgress = {
    totalItems: 0,
    completedItems: 0,
    totalSize: 0,
    downloadedSize: 0,
    estimatedTimeRemaining: 0,
    speed: 0,
    status: 'idle',
  }

  // Generate Sync Manifest
  async generateSyncManifest(options: SyncOptions): Promise<SyncManifest> {
    const startTime = Date.now()

    // Get categories to sync
    const categoriesToSync = await this.getCategoriesToSync(options.categories)

    const syncCategories: SyncCategory[] = []
    let totalSize = 0

    for (const category of categoriesToSync) {
      const remainingSize = options.maxSize ? options.maxSize - totalSize : undefined
      const syncCategory = await this.buildSyncCategory(category, options, remainingSize)

      if (syncCategory.size > 0) {
        syncCategories.push(syncCategory)
        totalSize += syncCategory.size

        // Check if we've reached the size limit
        if (options.maxSize && totalSize >= options.maxSize) {
          break
        }
      }
    }

    // Sort categories by priority
    syncCategories.sort((a, b) => b.priority - a.priority)

    // Calculate estimated sync time based on network conditions
    const estimatedSyncTime = this.calculateSyncTime(totalSize, options.networkConditions)

    const manifest: SyncManifest = {
      version: this.SYNC_VERSION,
      timestamp: new Date(),
      categories: syncCategories,
      totalSize,
      estimatedSyncTime,
      priority: options.priority || 'medium',
    }

    console.log(`Generated sync manifest in ${Date.now() - startTime}ms:`, {
      categories: syncCategories.length,
      totalSize: `${(totalSize / 1024 / 1024).toFixed(2)}MB`,
      estimatedTime: `${Math.round(estimatedSyncTime / 1000)}s`,
    })

    return manifest
  }

  // Sync Content
  async syncContent(
    manifest: SyncManifest,
    progressCallback?: (progress: SyncProgress) => void,
  ): Promise<OfflineContent> {
    this.syncProgress = {
      totalItems: this.countTotalItems(manifest),
      completedItems: 0,
      totalSize: manifest.totalSize,
      downloadedSize: 0,
      estimatedTimeRemaining: manifest.estimatedSyncTime,
      speed: 0,
      status: 'syncing',
    }

    const offlineContent: OfflineContent = {
      manifest,
      lastSync: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_DURATION),
      size: 0,
      items: new Map(),
      mediaAssets: new Map(),
    }

    const startTime = Date.now()
    let lastProgressUpdate = startTime

    try {
      // Sync each category
      for (const category of manifest.categories) {
        for (const concept of category.concepts) {
          for (const item of concept.items) {
            // Sync item content
            offlineContent.items.set(item.id, item)

            // Sync media assets
            for (const mediaAsset of item.mediaAssets) {
              if (!offlineContent.mediaAssets.has(mediaAsset.id)) {
                await this.syncMediaAsset(mediaAsset, offlineContent)
              }
            }

            // Update progress
            this.syncProgress.completedItems++
            this.syncProgress.downloadedSize += item.size

            // Calculate speed and ETA
            const elapsed = Date.now() - startTime
            if (elapsed > 1000) {
              // Update after at least 1 second
              this.syncProgress.speed = this.syncProgress.downloadedSize / (elapsed / 1000)
              const remaining = this.syncProgress.totalSize - this.syncProgress.downloadedSize
              this.syncProgress.estimatedTimeRemaining =
                (remaining / this.syncProgress.speed) * 1000
            }

            // Call progress callback
            if (progressCallback && Date.now() - lastProgressUpdate > 500) {
              // Throttle to 2Hz
              progressCallback({ ...this.syncProgress })
              lastProgressUpdate = Date.now()
            }

            // Check if sync should be paused or cancelled
            if (this.syncProgress.status === 'paused') {
              await this.waitForResume()
            }

            if (this.syncProgress.status === 'error') {
              throw new Error(this.syncProgress.error || 'Sync cancelled')
            }
          }
        }
      }

      this.syncProgress.status = 'completed'
      this.syncProgress.estimatedTimeRemaining = 0

      if (progressCallback) {
        progressCallback({ ...this.syncProgress })
      }

      offlineContent.size = this.syncProgress.downloadedSize

      console.log(`Sync completed in ${Date.now() - startTime}ms:`, {
        items: offlineContent.items.size,
        mediaAssets: offlineContent.mediaAssets.size,
        totalSize: `${(offlineContent.size / 1024 / 1024).toFixed(2)}MB`,
      })

      return offlineContent
    } catch (error) {
      this.syncProgress.status = 'error'
      this.syncProgress.error = error instanceof Error ? error.message : 'Unknown error'

      if (progressCallback) {
        progressCallback({ ...this.syncProgress })
      }

      throw error
    }
  }

  // Incremental Sync
  async incrementalSync(
    existingContent: OfflineContent,
    options: SyncOptions,
    progressCallback?: (progress: SyncProgress) => void,
  ): Promise<OfflineContent> {
    // Generate new manifest
    const newManifest = await this.generateSyncManifest(options)

    // Compare with existing manifest to find changes
    const changes = this.compareManifests(existingContent.manifest, newManifest)

    if (
      changes.added.length === 0 &&
      changes.updated.length === 0 &&
      changes.removed.length === 0
    ) {
      console.log('No changes detected, skipping incremental sync')
      return existingContent
    }

    console.log('Incremental sync changes:', {
      added: changes.added.length,
      updated: changes.updated.length,
      removed: changes.removed.length,
    })

    // Create updated content
    const updatedContent: OfflineContent = {
      ...existingContent,
      manifest: newManifest,
      lastSync: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_DURATION),
    }

    // Remove deleted items
    for (const itemId of changes.removed) {
      updatedContent.items.delete(itemId)
    }

    // Sync new and updated items
    const itemsToSync = [...changes.added, ...changes.updated]

    this.syncProgress = {
      totalItems: itemsToSync.length,
      completedItems: 0,
      totalSize: this.calculateItemsSize(itemsToSync, newManifest),
      downloadedSize: 0,
      estimatedTimeRemaining: 0,
      speed: 0,
      status: 'syncing',
    }

    const startTime = Date.now()

    for (const itemId of itemsToSync) {
      const item = this.findItemInManifest(itemId, newManifest)
      if (item) {
        updatedContent.items.set(itemId, item)

        // Sync media assets
        for (const mediaAsset of item.mediaAssets) {
          if (!updatedContent.mediaAssets.has(mediaAsset.id)) {
            await this.syncMediaAsset(mediaAsset, updatedContent)
          }
        }

        this.syncProgress.completedItems++
        this.syncProgress.downloadedSize += item.size

        if (progressCallback) {
          progressCallback({ ...this.syncProgress })
        }
      }
    }

    this.syncProgress.status = 'completed'
    updatedContent.size = Array.from(updatedContent.items.values()).reduce(
      (sum, item) => sum + item.size,
      0,
    )

    console.log(`Incremental sync completed in ${Date.now() - startTime}ms`)

    return updatedContent
  }

  // Content Validation
  async validateOfflineContent(content: OfflineContent): Promise<{
    valid: boolean
    issues: Array<{
      type: 'missing' | 'corrupted' | 'expired'
      itemId?: string
      mediaId?: string
      message: string
    }>
  }> {
    const issues: Array<{
      type: 'missing' | 'corrupted' | 'expired'
      itemId?: string
      mediaId?: string
      message: string
    }> = []

    // Check if content is expired
    if (content.expiresAt < new Date()) {
      issues.push({
        type: 'expired',
        message: `Content expired at ${content.expiresAt.toISOString()}`,
      })
    }

    // Validate each item
    for (const [itemId, item] of content.items) {
      // Check if item exists in current database
      const dbItem = await db.query.items.findFirst({
        where: eq(items.id, itemId),
      })

      if (!dbItem) {
        issues.push({
          type: 'missing',
          itemId,
          message: `Item ${itemId} no longer exists in database`,
        })
        continue
      }

      // Check if item has been updated
      if (dbItem.updatedAt > content.lastSync) {
        issues.push({
          type: 'expired',
          itemId,
          message: `Item ${itemId} has been updated since last sync`,
        })
      }

      // Validate media assets
      for (const mediaAsset of item.mediaAssets) {
        if (!content.mediaAssets.has(mediaAsset.id)) {
          issues.push({
            type: 'missing',
            itemId,
            mediaId: mediaAsset.id,
            message: `Media asset ${mediaAsset.id} is missing from offline content`,
          })
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  }

  // Sync Control
  pauseSync(): void {
    if (this.syncProgress.status === 'syncing') {
      this.syncProgress.status = 'paused'
    }
  }

  resumeSync(): void {
    if (this.syncProgress.status === 'paused') {
      this.syncProgress.status = 'syncing'
    }
  }

  cancelSync(): void {
    this.syncProgress.status = 'error'
    this.syncProgress.error = 'Sync cancelled by user'
  }

  getSyncProgress(): SyncProgress {
    return { ...this.syncProgress }
  }

  // Private Helper Methods
  private async getCategoriesToSync(categoryKeys?: string[]) {
    if (categoryKeys && categoryKeys.length > 0) {
      return await db.query.categories.findMany({
        where: and(inArray(categories.key, categoryKeys), eq(categories.isActive, true)),
        with: {
          concepts: {
            where: eq(concepts.isActive, true),
            with: {
              items: {
                where: eq(items.isActive, true),
                with: {
                  mediaAssets: {
                    with: {
                      mediaAsset: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    }

    return await db.query.categories.findMany({
      where: eq(categories.isActive, true),
      with: {
        concepts: {
          where: eq(concepts.isActive, true),
          with: {
            items: {
              where: eq(items.isActive, true),
              with: {
                mediaAssets: {
                  with: {
                    mediaAsset: true,
                  },
                },
              },
            },
          },
        },
      },
    })
  }

  private async buildSyncCategory(
    category: any,
    options: SyncOptions,
    maxSize?: number,
  ): Promise<SyncCategory> {
    const syncConcepts: SyncConcept[] = []
    let categorySize = 0

    for (const concept of category.concepts) {
      const syncConcept = await this.buildSyncConcept(concept, options)

      if (syncConcept.size > 0) {
        // Check if adding this concept would exceed the size limit
        if (maxSize && categorySize + syncConcept.size > maxSize) {
          break
        }

        syncConcepts.push(syncConcept)
        categorySize += syncConcept.size
      }
    }

    return {
      id: category.id,
      key: category.key,
      name: category.name,
      concepts: syncConcepts,
      size: categorySize,
      priority: this.calculateCategoryPriority(category),
    }
  }

  private async buildSyncConcept(concept: any, options: SyncOptions): Promise<SyncConcept> {
    const syncItems: SyncItem[] = []
    let conceptSize = 0

    for (const item of concept.items) {
      const syncItem = await this.buildSyncItem(item, options)
      syncItems.push(syncItem)
      conceptSize += syncItem.size
    }

    return {
      id: concept.id,
      key: concept.key,
      name: concept.name,
      items: syncItems,
      size: conceptSize,
      difficulty: concept.difficulty || 0.5,
      estimatedTime: concept.estimatedTime || 0,
    }
  }

  private async buildSyncItem(item: any, options: SyncOptions): Promise<SyncItem> {
    const syncMediaAssets: SyncMediaAsset[] = []
    let itemSize = 0

    // Calculate base item size (text content)
    const textSize = new Blob([
      JSON.stringify({
        id: item.id,
        slug: item.slug,
        title: item.title,
        body: item.body,
        type: item.type,
        options: item.options,
        correctAnswer: item.correctAnswer,
      }),
    ]).size

    itemSize += textSize

    // Process media assets if enabled
    if (options.includeMedia && item.mediaAssets) {
      for (const itemMedia of item.mediaAssets) {
        const mediaAsset = itemMedia.mediaAsset

        // Estimate optimized size based on device capabilities and compression level
        const optimizedSize = this.estimateOptimizedMediaSize(
          mediaAsset,
          options.deviceCapabilities,
          options.compressionLevel || 'medium',
        )

        const syncMediaAsset: SyncMediaAsset = {
          id: mediaAsset.id,
          url: mediaAsset.storageUrl,
          optimizedUrl: mediaAsset.cdnUrl || mediaAsset.storageUrl,
          type: mediaAsset.type,
          size: optimizedSize,
          format: this.getOptimalFormat(mediaAsset.type, options.deviceCapabilities),
          dimensions:
            mediaAsset.width && mediaAsset.height
              ? {
                  width: mediaAsset.width,
                  height: mediaAsset.height,
                }
              : undefined,
          checksum: this.generateChecksum(mediaAsset.id + mediaAsset.filename),
        }

        syncMediaAssets.push(syncMediaAsset)
        itemSize += optimizedSize
      }
    }

    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      body: item.body,
      type: item.type,
      difficulty: item.difficulty || 0.5,
      mediaAssets: syncMediaAssets,
      size: itemSize,
      offline: true,
    }
  }

  private async syncMediaAsset(mediaAsset: SyncMediaAsset, content: OfflineContent): Promise<void> {
    // In a real implementation, this would download and cache the media asset
    // For now, we'll just add it to the content map
    content.mediaAssets.set(mediaAsset.id, mediaAsset)
  }

  private calculateSyncTime(totalSize: number, networkConditions: NetworkConditions): number {
    // Convert downlink from Mbps to bytes per second
    const bytesPerSecond = (networkConditions.downlink * 1024 * 1024) / 8

    // Add overhead for HTTP requests and processing
    const overhead = 1.3

    return (totalSize / bytesPerSecond) * overhead * 1000 // Return in milliseconds
  }

  private countTotalItems(manifest: SyncManifest): number {
    return manifest.categories.reduce(
      (total, category) =>
        total +
        category.concepts.reduce((conceptTotal, concept) => conceptTotal + concept.items.length, 0),
      0,
    )
  }

  private calculateCategoryPriority(category: any): number {
    // Priority based on category importance and usage
    const priorityMap: Record<string, number> = {
      traffic_signs: 10,
      road_rules: 9,
      safety_procedures: 8,
      situational_judgment: 7,
      vehicle_operations: 6,
      parking_maneuvers: 5,
      hazard_perception: 8,
    }

    return priorityMap[category.key] || 5
  }

  private estimateOptimizedMediaSize(
    mediaAsset: any,
    deviceCapabilities: DeviceCapabilities,
    compressionLevel: string,
  ): number {
    const originalSize = mediaAsset.size

    // Compression ratios based on level and format
    const compressionRatios = {
      low: 0.8,
      medium: 0.6,
      high: 0.4,
    }

    const ratio = compressionRatios[compressionLevel as keyof typeof compressionRatios] || 0.6

    // Additional reduction for modern formats
    if (deviceCapabilities.supportsAVIF) {
      return Math.round(originalSize * ratio * 0.7)
    } else if (deviceCapabilities.supportsWebP) {
      return Math.round(originalSize * ratio * 0.8)
    }

    return Math.round(originalSize * ratio)
  }

  private getOptimalFormat(mediaType: string, deviceCapabilities: DeviceCapabilities): string {
    if (mediaType === 'IMAGE') {
      if (deviceCapabilities.supportsAVIF) return 'avif'
      if (deviceCapabilities.supportsWebP) return 'webp'
      return 'jpeg'
    }

    return 'original'
  }

  private generateChecksum(input: string): string {
    // Simple checksum for validation
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  private compareManifests(
    oldManifest: SyncManifest,
    newManifest: SyncManifest,
  ): { added: string[]; updated: string[]; removed: string[] } {
    const oldItems = new Set<string>()
    const newItems = new Set<string>()
    const oldItemMap = new Map<string, any>()
    const newItemMap = new Map<string, any>()

    // Build maps of old items
    for (const category of oldManifest.categories) {
      for (const concept of category.concepts) {
        for (const item of concept.items) {
          oldItems.add(item.id)
          oldItemMap.set(item.id, item)
        }
      }
    }

    // Build maps of new items
    for (const category of newManifest.categories) {
      for (const concept of category.concepts) {
        for (const item of concept.items) {
          newItems.add(item.id)
          newItemMap.set(item.id, item)
        }
      }
    }

    const added = Array.from(newItems).filter((id) => !oldItems.has(id))
    const removed = Array.from(oldItems).filter((id) => !newItems.has(id))
    const updated: string[] = []

    // Check for updates
    for (const id of newItems) {
      if (oldItems.has(id)) {
        const oldItem = oldItemMap.get(id)
        const newItem = newItemMap.get(id)

        // Simple comparison - in real implementation, would compare checksums or timestamps
        if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
          updated.push(id)
        }
      }
    }

    return { added, updated, removed }
  }

  private calculateItemsSize(itemIds: string[], manifest: SyncManifest): number {
    let totalSize = 0

    for (const category of manifest.categories) {
      for (const concept of category.concepts) {
        for (const item of concept.items) {
          if (itemIds.includes(item.id)) {
            totalSize += item.size
          }
        }
      }
    }

    return totalSize
  }

  private findItemInManifest(itemId: string, manifest: SyncManifest): SyncItem | null {
    for (const category of manifest.categories) {
      for (const concept of category.concepts) {
        for (const item of concept.items) {
          if (item.id === itemId) {
            return item
          }
        }
      }
    }
    return null
  }

  private async waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      const checkStatus = () => {
        if (this.syncProgress.status === 'syncing') {
          resolve()
        } else {
          setTimeout(checkStatus, 100)
        }
      }
      checkStatus()
    })
  }
}
