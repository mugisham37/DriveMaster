import { createHash } from 'crypto'

import { eq } from 'drizzle-orm'

import { db, mediaAssets, items } from '../db/connection.js'

export interface DeviceCapabilities {
  screenWidth: number
  screenHeight: number
  pixelDensity: number
  supportsWebP: boolean
  supportsAVIF: boolean
  supportsVideo: boolean
  maxVideoResolution: '480p' | '720p' | '1080p' | '4k'
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi'
  bandwidth: number // cSpell:ignore Mbps
  isLowEndDevice: boolean
  supportedCodecs: string[]
}

export interface NetworkConditions {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  downlink: number // cSpell:ignore Mbps
  rtt: number // Round trip time in ms
  saveData: boolean
}

export interface ContentDeliveryOptions {
  quality: 'low' | 'medium' | 'high' | 'auto'
  format: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto'
  maxWidth?: number
  maxHeight?: number
  progressive: boolean
  lazy: boolean
  preload: boolean
}

export interface OptimizedContent {
  id: string
  originalUrl: string
  optimizedUrl: string
  format: string
  width: number
  height: number
  size: number
  quality: number
  cacheKey: string
  expiresAt: Date
}

export interface PreloadManifest {
  contentId: string
  priority: 'high' | 'medium' | 'low'
  resources: Array<{
    url: string
    type: 'image' | 'video' | 'audio'
    size: number
    format: string
  }>
  totalSize: number
  estimatedLoadTime: number
}

export class ContentDeliveryService {
  private readonly CDN_BASE_URL = process.env.CDN_BASE_URL ?? 'https://cdn.drivemaster.com'
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours
  private readonly compressionCache = new Map<string, OptimizedContent>()

  // Progressive Content Enhancement
  async getOptimizedContent(
    mediaAssetId: string,
    deviceCapabilities: DeviceCapabilities,
    networkConditions: NetworkConditions,
    options: Partial<ContentDeliveryOptions> = {},
  ): Promise<OptimizedContent> {
    // Get media asset from database
    const mediaAsset = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, mediaAssetId),
    })

    if (!mediaAsset) {
      throw new Error('Media asset not found')
    }

    // Determine optimal delivery options based on device and network
    const deliveryOptions = this.calculateOptimalDeliveryOptions(
      deviceCapabilities,
      networkConditions,
      options,
    )

    // Generate cache key
    const cacheKey = this.generateCacheKey(mediaAssetId, deliveryOptions, deviceCapabilities)

    // Check cache first
    const cached = this.compressionCache.get(cacheKey)
    if (cached && cached.expiresAt > new Date()) {
      return cached
    }

    // Generate optimized content
    const optimizedContent = this.generateOptimizedContent(
      mediaAsset,
      deliveryOptions,
      deviceCapabilities,
      cacheKey,
    )

    // Cache the result
    this.compressionCache.set(cacheKey, optimizedContent)

    return optimizedContent
  }

  // Adaptive Content Delivery
  private calculateOptimalDeliveryOptions(
    deviceCapabilities: DeviceCapabilities,
    networkConditions: NetworkConditions,
    userOptions: Partial<ContentDeliveryOptions>,
  ): ContentDeliveryOptions {
    const options: ContentDeliveryOptions = {
      quality: 'auto',
      format: 'auto',
      progressive: true,
      lazy: true,
      preload: false,
      ...userOptions,
    }

    // Adjust quality based on network conditions
    if (options.quality === 'auto') {
      if (networkConditions.saveData || networkConditions.effectiveType === 'slow-2g') {
        options.quality = 'low'
      } else if (networkConditions.effectiveType === '2g' || networkConditions.downlink < 1) {
        options.quality = 'low'
      } else if (networkConditions.effectiveType === '3g' || networkConditions.downlink < 5) {
        options.quality = 'medium'
      } else {
        options.quality = 'high'
      }
    }

    // Adjust format based on device capabilities
    if (options.format === 'auto') {
      if (deviceCapabilities.supportsAVIF) {
        options.format = 'avif'
      } else if (deviceCapabilities.supportsWebP) {
        options.format = 'webp'
      } else {
        options.format = 'jpeg'
      }
    }

    // Set maximum dimensions based on device screen
    if (typeof options.maxWidth !== 'number' || options.maxWidth <= 0) {
      options.maxWidth = Math.min(
        deviceCapabilities.screenWidth * deviceCapabilities.pixelDensity,
        2048,
      )
    }
    if (typeof options.maxHeight !== 'number' || options.maxHeight <= 0) {
      options.maxHeight = Math.min(
        deviceCapabilities.screenHeight * deviceCapabilities.pixelDensity,
        2048,
      )
    }

    // Disable preloading on slow connections
    if (networkConditions.effectiveType === 'slow-2g' || networkConditions.effectiveType === '2g') {
      options.preload = false
    }

    return options
  }

  private generateOptimizedContent(
    mediaAsset: typeof mediaAssets.$inferSelect,
    options: ContentDeliveryOptions,
    deviceCapabilities: DeviceCapabilities,
    cacheKey: string,
  ): OptimizedContent {
    // Calculate quality parameters
    const qualityMap = { low: 60, medium: 80, high: 95 }
    const quality =
      qualityMap[options.quality as keyof typeof qualityMap] !== undefined
        ? qualityMap[options.quality as keyof typeof qualityMap]
        : 80

    // Calculate optimal dimensions
    const originalWidth = typeof mediaAsset.width === 'number' ? mediaAsset.width : 1920
    const originalHeight = typeof mediaAsset.height === 'number' ? mediaAsset.height : 1080
    const maxWidth = typeof options.maxWidth === 'number' ? options.maxWidth : 1920
    const maxHeight = typeof options.maxHeight === 'number' ? options.maxHeight : 1080

    const { width, height } = this.calculateOptimalDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight,
    )

    // Generate optimized URL with parameters
    const optimizedUrl = this.buildOptimizedUrl(mediaAsset.cdnUrl ?? mediaAsset.storageUrl, {
      format: options.format,
      width,
      height,
      quality,
      progressive: options.progressive,
    })

    // Estimate file size based on compression
    const estimatedSize = this.estimateCompressedSize(
      mediaAsset.size,
      width,
      height,
      originalWidth,
      originalHeight,
      quality,
      options.format,
    )

    return {
      id: mediaAsset.id,
      originalUrl: mediaAsset.cdnUrl ?? mediaAsset.storageUrl,
      optimizedUrl,
      format: options.format,
      width,
      height,
      size: estimatedSize,
      quality,
      cacheKey,
      expiresAt: new Date(Date.now() + this.CACHE_TTL),
    }
  }

  // Content Caching Strategies
  getCachedContent(cacheKey: string): OptimizedContent | null {
    const cached = this.compressionCache.get(cacheKey)
    if (cached && cached.expiresAt > new Date()) {
      return cached
    }
    return null
  }

  setCachedContent(cacheKey: string, content: OptimizedContent): void {
    this.compressionCache.set(cacheKey, content)
  }

  invalidateCache(mediaAssetId: string): void {
    // Remove all cached versions of this media asset
    for (const [key, content] of this.compressionCache.entries()) {
      if (content.id === mediaAssetId) {
        this.compressionCache.delete(key)
      }
    }
  }

  // Content Preloading and Offline Sync
  async generatePreloadManifest(
    itemId: string,
    deviceCapabilities: DeviceCapabilities,
    networkConditions: NetworkConditions,
  ): Promise<PreloadManifest> {
    // Get item with all media assets
    const item = await db.query.items.findFirst({
      where: eq(items.id, itemId),
      with: {
        mediaAssets: {
          with: {
            mediaAsset: true,
          },
        },
      },
    })

    if (!item) {
      throw new Error('Item not found')
    }

    const resources: PreloadManifest['resources'] = []
    let totalSize = 0

    // Process each media asset
    for (const itemMedia of item.mediaAssets) {
      const mediaAsset = itemMedia.mediaAsset

      // Get optimized version for this device/network
      const optimized = await this.getOptimizedContent(
        mediaAsset.id,
        deviceCapabilities,
        networkConditions,
        { preload: true },
      )

      resources.push({
        url: optimized.optimizedUrl,
        type: this.mapMediaTypeToResourceType(mediaAsset.type),
        size: optimized.size,
        format: optimized.format,
      })

      totalSize += optimized.size
    }

    // Calculate estimated load time based on network conditions
    const estimatedLoadTime = this.calculateLoadTime(totalSize, networkConditions.downlink)

    // Determine priority based on item importance and network conditions
    const priority = this.calculatePreloadPriority(item, networkConditions)

    return {
      contentId: itemId,
      priority,
      resources,
      totalSize,
      estimatedLoadTime,
    }
  }

  async preloadContent(
    itemIds: string[],
    deviceCapabilities: DeviceCapabilities,
    networkConditions: NetworkConditions,
  ): Promise<PreloadManifest[]> {
    const manifests: PreloadManifest[] = []

    for (const itemId of itemIds) {
      try {
        const manifest = await this.generatePreloadManifest(
          itemId,
          deviceCapabilities,
          networkConditions,
        )
        manifests.push(manifest)
      } catch (error) {
        // Using console.error is acceptable for error logging
        // eslint-disable-next-line no-console
        console.error(`Failed to generate preload manifest for item ${itemId}:`, error)
      }
    }

    // Sort by priority and estimated load time
    return manifests.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const aPriority = priorityOrder[a.priority]
      const bPriority = priorityOrder[b.priority]

      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      return a.estimatedLoadTime - b.estimatedLoadTime
    })
  }

  // Content Compression and Mobile Optimization
  async getCompressedContent(
    mediaAssetId: string,
    targetSize: number,
    deviceCapabilities: DeviceCapabilities,
  ): Promise<OptimizedContent> {
    const mediaAsset = await db.query.mediaAssets.findFirst({
      where: eq(mediaAssets.id, mediaAssetId),
    })

    if (!mediaAsset) {
      throw new Error('Media asset not found')
    }

    // Calculate compression parameters to achieve target size
    const compressionParams = this.calculateCompressionForTargetSize(
      mediaAsset,
      targetSize,
      deviceCapabilities,
    )

    const cacheKey = this.generateCacheKey(mediaAssetId, compressionParams, deviceCapabilities)

    // Check cache
    const cached = this.compressionCache.get(cacheKey)
    if (cached && cached.expiresAt > new Date()) {
      return cached
    }

    // Generate compressed content
    const optimizedContent = this.generateOptimizedContent(
      mediaAsset,
      compressionParams,
      deviceCapabilities,
      cacheKey,
    )

    this.compressionCache.set(cacheKey, optimizedContent)
    return optimizedContent
  }

  // Utility Methods
  private calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight

    let width = Math.min(originalWidth, maxWidth)
    let height = width / aspectRatio

    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }

    return {
      width: Math.round(width),
      height: Math.round(height),
    }
  }

  private buildOptimizedUrl(
    baseUrl: string,
    params: {
      format: string
      width: number
      height: number
      quality: number
      progressive: boolean
    },
  ): string {
    // Create transform URL
    const transformUrl = `${this.CDN_BASE_URL}/transform`
    const url = new URL(transformUrl)

    url.searchParams.set('f', params.format)
    url.searchParams.set('w', params.width.toString())
    url.searchParams.set('h', params.height.toString())
    url.searchParams.set('q', params.quality.toString())

    if (params.progressive) {
      url.searchParams.set('progressive', '1')
    }

    return url.toString()
  }

  private estimateCompressedSize(
    originalSize: number,
    newWidth: number,
    newHeight: number,
    originalWidth: number,
    originalHeight: number,
    quality: number,
    format: string,
  ): number {
    // Calculate size reduction from resolution change
    const resolutionRatio = (newWidth * newHeight) / (originalWidth * originalHeight)

    // Calculate compression ratio based on quality and format
    const formatMultipliers = { avif: 0.3, webp: 0.5, jpeg: 0.7, png: 0.9 }
    const formatMultiplier =
      formatMultipliers[format as keyof typeof formatMultipliers] !== undefined
        ? formatMultipliers[format as keyof typeof formatMultipliers]
        : 0.7

    const qualityMultiplier = quality / 100

    return Math.round(originalSize * resolutionRatio * formatMultiplier * qualityMultiplier)
  }

  private calculateCompressionForTargetSize(
    mediaAsset: typeof mediaAssets.$inferSelect,
    targetSize: number,
    deviceCapabilities: DeviceCapabilities,
  ): ContentDeliveryOptions {
    const currentSize = mediaAsset.size
    const compressionRatio = targetSize / currentSize

    // Start with high quality and adjust down
    let quality: 'low' | 'medium' | 'high' = 'high'
    let format: ContentDeliveryOptions['format'] = deviceCapabilities.supportsAVIF
      ? 'avif'
      : deviceCapabilities.supportsWebP
        ? 'webp'
        : 'jpeg'

    if (compressionRatio < 0.3) {
      quality = 'low'
      format = 'avif' // Most aggressive compression
    } else if (compressionRatio < 0.6) {
      quality = 'medium'
    }

    // Calculate dimensions to achieve target size
    const dimensionReduction = Math.sqrt(compressionRatio)
    const maxWidth = Math.round((mediaAsset.width ?? 1920) * dimensionReduction)
    const maxHeight = Math.round((mediaAsset.height ?? 1080) * dimensionReduction)

    return {
      quality,
      format,
      maxWidth,
      maxHeight,
      progressive: true,
      lazy: true,
      preload: false,
    }
  }

  // cSpell:ignore Mbps
  private calculateLoadTime(sizeBytes: number, bandwidthMbps: number): number {
    const sizeMb = sizeBytes / (1024 * 1024)
    return Math.round((sizeMb / bandwidthMbps) * 1000) // Return in milliseconds
  }

  private calculatePreloadPriority(
    item: typeof items.$inferSelect,
    networkConditions: NetworkConditions,
  ): 'high' | 'medium' | 'low' {
    // High priority for critical content on good connections
    if (
      typeof item.difficulty === 'number' &&
      item.difficulty > 0.8 &&
      networkConditions.downlink > 5
    ) {
      return 'high'
    }

    // Low priority on slow connections
    if (networkConditions.effectiveType === 'slow-2g' || networkConditions.effectiveType === '2g') {
      return 'low'
    }

    return 'medium'
  }

  private mapMediaTypeToResourceType(mediaType: string): 'image' | 'video' | 'audio' {
    switch (mediaType) {
      case 'IMAGE':
        return 'image'
      case 'VIDEO':
      case 'ANIMATION':
      case 'SIMULATION':
        return 'video'
      case 'AUDIO':
        return 'audio'
      default:
        return 'image'
    }
  }

  private generateCacheKey(
    mediaAssetId: string,
    options: ContentDeliveryOptions,
    deviceCapabilities: DeviceCapabilities,
  ): string {
    const keyData = {
      id: mediaAssetId,
      options,
      screen: `${deviceCapabilities.screenWidth}x${deviceCapabilities.screenHeight}`,
      density: deviceCapabilities.pixelDensity,
      formats: [
        deviceCapabilities.supportsAVIF ? 'avif' : '',
        deviceCapabilities.supportsWebP ? 'webp' : '',
      ]
        .filter(Boolean)
        .join(','),
    }

    return createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  // Cache Management
  clearExpiredCache(): number {
    const now = new Date()
    let cleared = 0

    for (const [key, content] of this.compressionCache.entries()) {
      if (content.expiresAt <= now) {
        this.compressionCache.delete(key)
        cleared++
      }
    }

    return cleared
  }

  getCacheStats(): { size: number; totalItems: number } {
    let totalSize = 0

    for (const content of this.compressionCache.values()) {
      totalSize += content.size
    }

    return {
      size: totalSize,
      totalItems: this.compressionCache.size,
    }
  }
}
