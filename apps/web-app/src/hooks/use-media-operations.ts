/**
 * Media Operations Hooks
 * 
 * React hooks for media asset management
 * Requirements: 3.1, 3.2
 */

import { useState, useCallback, useRef, useMemo } from 'react'
import useSWR, { mutate } from 'swr'
import { contentServiceClient, contentCacheKeys, contentSWRConfigs } from '@/lib/content-service'
import type {
  MediaAsset,
  UploadMediaDto,
  SignedUrlOptions
} from '@/types'

// ============================================================================
// Media Upload Hook
// ============================================================================

export interface UseMediaUploadOptions {
  onProgress?: (progress: number) => void
  onSuccess?: (asset: MediaAsset) => void
  onError?: (error: Error) => void
  optimize?: boolean
}

export interface UseMediaUploadReturn {
  uploadMedia: (itemId: string, file: File, metadata?: Partial<UploadMediaDto>) => Promise<MediaAsset | null>
  isUploading: boolean
  progress: number
  error: Error | null
  cancelUpload: () => void
}

/**
 * Hook for media upload with progress tracking and optimization
 * Requirements: 3.1, 3.4, 3.5
 */
export function useMediaUpload(options?: UseMediaUploadOptions): UseMediaUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const uploadMedia = useCallback(async (
    itemId: string, 
    file: File, 
    metadata?: Partial<UploadMediaDto>
  ): Promise<MediaAsset | null> => {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      // Enhanced metadata with optimization settings
      const enhancedMetadata: Partial<UploadMediaDto> = {
        ...metadata,
        optimize: options?.optimize !== false
      }

      const result = await contentServiceClient.uploadMedia(itemId, file, enhancedMetadata)
      
      // Invalidate media cache for this item
      mutate(contentCacheKeys.mediaAssets(itemId))
      
      // Invalidate content item cache to update media references
      mutate(contentCacheKeys.contentItem(itemId))
      
      setProgress(100)
      options?.onSuccess?.(result)
      
      return result
    } catch (err) {
      const error = err as Error
      setError(error)
      options?.onError?.(error)
      return null
    } finally {
      setIsUploading(false)
      abortControllerRef.current = null
    }
  }, [options])

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsUploading(false)
      setProgress(0)
      setError(new Error('Upload cancelled by user'))
    }
  }, [])

  return {
    uploadMedia,
    isUploading,
    progress,
    error,
    cancelUpload
  }
}

// ============================================================================
// Media Asset Hooks
// ============================================================================

/**
 * Hook for fetching media assets for a content item
 * Requirements: 3.2
 */
export function useMediaAssets(itemId: string | null) {
  const { data, error, isLoading, mutate: mutateFn } = useSWR(
    itemId ? contentCacheKeys.mediaAssets(itemId) : null,
    () => itemId ? contentServiceClient.getMediaAssets(itemId) : null,
    contentSWRConfigs.media
  )

  const refresh = useCallback(() => {
    if (itemId) mutateFn()
  }, [itemId, mutateFn])

  return {
    assets: data || [],
    isLoading,
    error,
    refresh
  }
}

/**
 * Hook for fetching a single media asset
 * Requirements: 3.2
 */
export function useMediaAsset(id: string | null) {
  const { data, error, isLoading, mutate: mutateFn } = useSWR(
    id ? contentCacheKeys.mediaAsset(id) : null,
    () => id ? contentServiceClient.getMediaAsset(id) : null,
    contentSWRConfigs.media
  )

  const refresh = useCallback(() => {
    if (id) mutateFn()
  }, [id, mutateFn])

  return {
    asset: data,
    isLoading,
    error,
    refresh
  }
}

/**
 * Hook for generating signed URLs for media assets
 * Requirements: 3.2
 */
export function useMediaSignedUrl(id: string | null, options?: SignedUrlOptions) {
  const { data, error, isLoading, mutate: mutateFn } = useSWR(
    id ? contentCacheKeys.mediaSignedUrl(id, options) : null,
    () => id ? contentServiceClient.getMediaSignedUrl(id, options) : null,
    {
      ...contentSWRConfigs.media,
      refreshInterval: 0, // Don't auto-refresh signed URLs
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  )

  const regenerateUrl = useCallback(() => {
    if (id) mutateFn()
  }, [id, mutateFn])

  return {
    url: data,
    isLoading,
    error,
    regenerateUrl
  }
}

/**
 * Hook for deleting media assets
 * Requirements: 3.1
 */
export function useDeleteMediaAsset() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const deleteAsset = useCallback(async (id: string, itemId?: string): Promise<boolean> => {
    setIsDeleting(true)
    setError(null)

    try {
      await contentServiceClient.deleteMediaAsset(id)
      
      // Remove from cache
      mutate(contentCacheKeys.mediaAsset(id), undefined)
      
      // Invalidate media assets list if itemId is provided
      if (itemId) {
        mutate(contentCacheKeys.mediaAssets(itemId))
        mutate(contentCacheKeys.contentItem(itemId))
      }
      
      return true
    } catch (err) {
      setError(err as Error)
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [])

  return {
    deleteAsset,
    isDeleting,
    error
  }
}

// ============================================================================
// Batch Media Operations
// ============================================================================

export interface BatchUploadProgress {
  total: number
  completed: number
  failed: number
  current: string | undefined
  progress: number
}

/**
 * Hook for batch media upload
 * Requirements: 3.1, 3.4
 */
export function useBatchMediaUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<BatchUploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    progress: 0
  })
  const [error, setError] = useState<Error | null>(null)
  const [results, setResults] = useState<(MediaAsset | Error)[]>([])

  const uploadBatch = useCallback(async (
    itemId: string,
    files: File[],
    metadata?: Partial<UploadMediaDto>
  ): Promise<(MediaAsset | Error)[]> => {
    setIsUploading(true)
    setError(null)
    setResults([])
    setProgress({
      total: files.length,
      completed: 0,
      failed: 0,
      progress: 0
    })

    const uploadResults: (MediaAsset | Error)[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file) continue
        
        setProgress(prev => ({
          ...prev,
          current: file.name,
          progress: (i / files.length) * 100
        }))

        try {
          const result = await contentServiceClient.uploadMedia(itemId, file, metadata)
          uploadResults.push(result)
          
          setProgress(prev => ({
            ...prev,
            completed: prev.completed + 1,
            progress: ((i + 1) / files.length) * 100
          }))
        } catch (err) {
          const error = err as Error
          uploadResults.push(error)
          
          setProgress(prev => ({
            ...prev,
            failed: prev.failed + 1,
            progress: ((i + 1) / files.length) * 100
          }))
        }
      }

      // Invalidate caches
      mutate(contentCacheKeys.mediaAssets(itemId))
      mutate(contentCacheKeys.contentItem(itemId))

      setResults(uploadResults)
      return uploadResults
    } catch (err) {
      setError(err as Error)
      return uploadResults
    } finally {
      setIsUploading(false)
      setProgress(prev => ({ ...prev, current: undefined }))
    }
  }, [])

  return {
    uploadBatch,
    isUploading,
    progress,
    error,
    results
  }
}

// ============================================================================
// Media Validation and Optimization
// ============================================================================

export interface MediaValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  optimizedSize: number | undefined
  compressionRatio: number | undefined
}

/**
 * Hook for media file validation and optimization preview
 * Requirements: 3.3
 */
export function useMediaValidation() {
  const [isValidating, setIsValidating] = useState(false)

  const validateFile = useCallback(async (file: File): Promise<MediaValidationResult> => {
    setIsValidating(true)

    try {
      // Import validation utility
      const { validateFile: validate } = await import('../utils/media-optimization')
      
      const validation = validate(file)
      
      // If it's an image, calculate potential optimization
      let optimizedSize: number | undefined = undefined
      let compressionRatio: number | undefined = undefined
      
      if (file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
        // Estimate compression (this would be more accurate with actual optimization)
        optimizedSize = Math.round(file.size * 0.7) // Rough estimate
        compressionRatio = ((file.size - optimizedSize) / file.size) * 100
      }

      return {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        optimizedSize,
        compressionRatio
      }
    } catch (_error) {
      return {
        isValid: false,
        errors: ['Failed to validate file'],
        warnings: [],
        optimizedSize: undefined,
        compressionRatio: undefined
      }
    } finally {
      setIsValidating(false)
    }
  }, [])

  return {
    validateFile,
    isValidating
  }
}

// ============================================================================
// Media Gallery Hook
// ============================================================================

export interface MediaGalleryFilters {
  type?: string
  search?: string
  sortBy?: 'name' | 'size' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Hook for media gallery with filtering and sorting
 * Requirements: 3.2
 */
export function useMediaGallery(itemId: string | null, initialFilters?: MediaGalleryFilters) {
  const [filters, setFilters] = useState<MediaGalleryFilters>(initialFilters || {})
  const { assets, isLoading, error, refresh } = useMediaAssets(itemId)

  // Filter and sort assets based on current filters
  const filteredAssets = useMemo(() => {
    if (!assets) return []

    let filtered = [...assets]

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(asset => asset.mimeType.startsWith(filters.type!))
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(asset => 
        asset.filename.toLowerCase().includes(searchLower) ||
        asset.originalName.toLowerCase().includes(searchLower)
      )
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue: string | number
        let bValue: string | number

        switch (filters.sortBy) {
          case 'name':
            aValue = a.filename.toLowerCase()
            bValue = b.filename.toLowerCase()
            break
          case 'size':
            aValue = a.size
            bValue = b.size
            break
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime()
            bValue = new Date(b.createdAt).getTime()
            break
          default:
            return 0
        }

        if (aValue < bValue) return filters.sortOrder === 'desc' ? 1 : -1
        if (aValue > bValue) return filters.sortOrder === 'desc' ? -1 : 1
        return 0
      })
    }

    return filtered
  }, [assets, filters])

  const updateFilter = useCallback((key: keyof MediaGalleryFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters || {})
  }, [initialFilters])

  return {
    assets: filteredAssets,
    allAssets: assets || [],
    isLoading,
    error,
    refresh,
    filters,
    updateFilter,
    resetFilters
  }
}