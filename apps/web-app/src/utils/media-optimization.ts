/**
 * Media Optimization Utilities
 * 
 * Client-side media optimization before upload including image compression,
 * file validation, and thumbnail generation
 * Requirements: 3.3
 */

// ============================================================================
// Image Optimization Configuration
// ============================================================================

interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  maintainAspectRatio?: boolean
}

interface ThumbnailOptions {
  width: number
  height: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// ============================================================================
// File Validation
// ============================================================================

/**
 * Validates file type and size limits
 */
export function validateFile(file: File): FileValidationResult {
  const result: FileValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  // File size validation
  const maxFileSize = 100 * 1024 * 1024 // 100MB
  if (file.size > maxFileSize) {
    result.isValid = false
    result.errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of 100MB`)
  }

  // Warn for large files that might benefit from compression
  const largeFileThreshold = 10 * 1024 * 1024 // 10MB
  if (file.size > largeFileThreshold && file.type.startsWith('image/')) {
    result.warnings.push('Large image file detected. Consider optimizing before upload.')
  }

  // File type validation
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/ogg',
    'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip', 'application/x-zip-compressed'
  ]

  if (!allowedTypes.includes(file.type)) {
    result.isValid = false
    result.errors.push(`File type ${file.type} is not allowed`)
  }

  // File name validation
  if (!file.name || file.name.trim().length === 0) {
    result.isValid = false
    result.errors.push('File must have a valid name')
  }

  // Check for potentially dangerous file extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  if (dangerousExtensions.includes(fileExtension)) {
    result.isValid = false
    result.errors.push(`File extension ${fileExtension} is not allowed for security reasons`)
  }

  return result
}

/**
 * Gets the media type category from MIME type
 */
export function getMediaType(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'archive' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return 'document'
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive'
  return 'document' // Default fallback
}

// ============================================================================
// Image Optimization
// ============================================================================

/**
 * Compresses an image file before upload
 */
export async function optimizeImage(file: File, options: ImageOptimizationOptions = {}): Promise<File> {
  // Only process image files
  if (!file.type.startsWith('image/')) {
    return file
  }

  // Skip SVG files as they're already optimized
  if (file.type === 'image/svg+xml') {
    return file
  }

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'jpeg',
    maintainAspectRatio = true
  } = options

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      try {
        // Calculate new dimensions
        const { width, height } = calculateOptimalDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight,
          maintainAspectRatio
        )

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // Create new file with compressed data
            const optimizedFile = new File([blob], file.name, {
              type: `image/${format}`,
              lastModified: Date.now()
            })

            resolve(optimizedFile)
          },
          `image/${format}`,
          quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for optimization'))
    }

    // Load image from file
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }
    reader.onerror = () => {
      reject(new Error('Failed to read image file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Generates a thumbnail for an image
 */
export async function generateThumbnail(file: File, options: ThumbnailOptions): Promise<File> {
  // Only process image files
  if (!file.type.startsWith('image/')) {
    throw new Error('Thumbnails can only be generated for image files')
  }

  // Skip SVG files
  if (file.type === 'image/svg+xml') {
    throw new Error('Thumbnails cannot be generated for SVG files')
  }

  const {
    width,
    height,
    quality = 0.7,
    format = 'jpeg'
  } = options

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      try {
        // Set canvas to thumbnail dimensions
        canvas.width = width
        canvas.height = height

        // Calculate crop dimensions to maintain aspect ratio
        const sourceAspectRatio = img.width / img.height
        const targetAspectRatio = width / height

        let sourceX = 0
        let sourceY = 0
        let sourceWidth = img.width
        let sourceHeight = img.height

        if (sourceAspectRatio > targetAspectRatio) {
          // Source is wider, crop horizontally
          sourceWidth = img.height * targetAspectRatio
          sourceX = (img.width - sourceWidth) / 2
        } else {
          // Source is taller, crop vertically
          sourceHeight = img.width / targetAspectRatio
          sourceY = (img.height - sourceHeight) / 2
        }

        // Draw cropped and resized image
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, width, height
        )

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate thumbnail'))
              return
            }

            // Create thumbnail file
            const thumbnailName = `thumb_${width}x${height}_${file.name}`
            const thumbnailFile = new File([blob], thumbnailName, {
              type: `image/${format}`,
              lastModified: Date.now()
            })

            resolve(thumbnailFile)
          },
          `image/${format}`,
          quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'))
    }

    // Load image from file
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }
    reader.onerror = () => {
      reject(new Error('Failed to read image file'))
    }
    reader.readAsDataURL(file)
  })
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates optimal dimensions for image resizing
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
  maintainAspectRatio: boolean
): { width: number; height: number } {
  if (!maintainAspectRatio) {
    return { width: maxWidth, height: maxHeight }
  }

  const aspectRatio = originalWidth / originalHeight

  let width = originalWidth
  let height = originalHeight

  // Scale down if necessary
  if (width > maxWidth) {
    width = maxWidth
    height = width / aspectRatio
  }

  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  }
}

/**
 * Estimates compressed file size
 */
export function estimateCompressedSize(originalSize: number, quality: number): number {
  // Rough estimation based on JPEG compression ratios
  const compressionRatio = quality * 0.7 + 0.1 // Quality 0.8 ≈ 0.66 compression ratio
  return Math.round(originalSize * compressionRatio)
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Gets image dimensions from file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File is not an image')
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }
    reader.onerror = () => {
      reject(new Error('Failed to read image file'))
    }
    reader.readAsDataURL(file)
  })
}