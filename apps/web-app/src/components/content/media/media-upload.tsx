/**
 * Media Upload Component
 * 
 * Drag-and-drop media upload with progress tracking and validation
 * Requirements: 3.1, 3.2
 */

'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useMediaUpload, useBatchMediaUpload, useMediaValidation } from '@/hooks/use-media-operations'
import type { MediaAsset } from '@/types'

// ============================================================================
// Types
// ============================================================================

export interface MediaUploadProps {
  itemId: string
  onUploadComplete?: (assets: MediaAsset[]) => void
  onUploadError?: (error: Error) => void
  acceptedTypes?: string[]
  maxFileSize?: number
  maxFiles?: number
  enableBatch?: boolean
  enablePreview?: boolean
  className?: string
}

export interface FilePreviewProps {
  file: File
  onRemove: () => void
  validationResult?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } | undefined
}

export interface UploadProgressProps {
  progress: number
  fileName?: string | undefined
  isComplete?: boolean
  error?: string | undefined
}

// ============================================================================
// File Preview Component
// ============================================================================

export function FilePreview({ file, onRemove, validationResult }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Generate preview for images
  React.useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    return undefined;
  }, [file])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️'
    if (type.startsWith('video/')) return '🎥'
    if (type.startsWith('audio/')) return '🎵'
    if (type === 'application/pdf') return '📄'
    return '📎'
  }

  const hasErrors = validationResult && !validationResult.isValid
  const hasWarnings = validationResult && validationResult.warnings.length > 0

  return (
    <div className={`bg-white border rounded-lg p-3 ${hasErrors ? 'border-red-300 bg-red-50' : hasWarnings ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
      <div className="flex items-start space-x-3">
        {/* Preview/Icon */}
        <div className="flex-shrink-0">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="w-12 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
              <span className="text-xl">{getFileIcon(file.type)}</span>
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {file.name}
          </h4>
          <p className="text-xs text-gray-500">
            {file.type} • {formatFileSize(file.size)}
          </p>

          {/* Validation Messages */}
          {validationResult && (
            <div className="mt-2 space-y-1">
              {validationResult.errors.map((error, index) => (
                <p key={index} className="text-xs text-red-600">
                  ❌ {error}
                </p>
              ))}
              {validationResult.warnings.map((warning, index) => (
                <p key={index} className="text-xs text-yellow-600">
                  ⚠️ {warning}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Remove Button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 rounded"
          title="Remove file"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// Upload Progress Component
// ============================================================================

export function UploadProgress({ progress, fileName, isComplete, error }: UploadProgressProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">
          {fileName ? `Uploading ${fileName}` : 'Uploading files...'}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            error ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 mt-2">
          ❌ {error}
        </p>
      )}

      {isComplete && !error && (
        <p className="text-sm text-green-600 mt-2">
          ✅ Upload complete
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Main Media Upload Component
// ============================================================================

export function MediaUpload({
  itemId,
  onUploadComplete,
  onUploadError,
  acceptedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf'],
  maxFileSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  enableBatch = true,
  enablePreview = true,
  className = ''
}: MediaUploadProps) {
  // Hooks
  const { uploadMedia, isUploading: isSingleUploading, progress: singleProgress, error: singleError } = useMediaUpload({
    onSuccess: (asset) => onUploadComplete?.([asset]),
    onError: onUploadError || (() => {})
  })

  const { 
    uploadBatch, 
    isUploading: isBatchUploading, 
    progress: batchProgress, 
    error: batchError,
    results: batchResults
  } = useBatchMediaUpload()

  const { validateFile, isValidating } = useMediaValidation()

  // State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [validationResults, setValidationResults] = useState<Map<string, { isValid: boolean; errors: string[]; warnings: string[] }>>(new Map())
  const [isDragOver, setIsDragOver] = useState(false)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // File validation
  const validateFiles = useCallback(async (files: File[]) => {
    const results = new Map()
    
    for (const file of files) {
      const result = await validateFile(file)
      results.set(file.name, result)
    }
    
    setValidationResults(results)
  }, [validateFile])

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    
    // Filter by accepted types
    const validFiles = fileArray.filter(file => {
      return acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1))
        }
        return file.type === type
      })
    })

    // Limit number of files
    const limitedFiles = validFiles.slice(0, maxFiles - selectedFiles.length)
    
    // Add to selected files
    const newFiles = [...selectedFiles, ...limitedFiles].slice(0, maxFiles)
    setSelectedFiles(newFiles)
    
    // Validate new files
    await validateFiles(limitedFiles)
  }, [selectedFiles, acceptedTypes, maxFiles, validateFiles])

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  // Remove file
  const removeFile = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    
    // Remove validation result
    const fileToRemove = selectedFiles[index]
    if (fileToRemove) {
      const newResults = new Map(validationResults)
      newResults.delete(fileToRemove.name)
      setValidationResults(newResults)
    }
  }, [selectedFiles, validationResults])

  // Upload files
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return

    // Check for validation errors
    const hasErrors = Array.from(validationResults.values()).some(result => !result.isValid)
    if (hasErrors) {
      onUploadError?.(new Error('Please fix validation errors before uploading'))
      return
    }

    try {
      if (enableBatch && selectedFiles.length > 1) {
        // Batch upload
        const results = await uploadBatch(itemId, selectedFiles)
        const successfulUploads = results.filter(result => !(result instanceof Error)) as MediaAsset[]
        
        if (successfulUploads.length > 0) {
          onUploadComplete?.(successfulUploads)
          setSelectedFiles([])
          setValidationResults(new Map())
        }
      } else {
        // Single file upload
        const file = selectedFiles[0]
        if (file) {
          const result = await uploadMedia(itemId, file)
          
          if (result) {
            onUploadComplete?.([result])
            setSelectedFiles([])
            setValidationResults(new Map())
          }
        }
      }
    } catch (error) {
      onUploadError?.(error as Error)
    }
  }, [selectedFiles, validationResults, enableBatch, uploadBatch, uploadMedia, itemId, onUploadComplete, onUploadError])

  // Clear all files
  const clearFiles = useCallback(() => {
    setSelectedFiles([])
    setValidationResults(new Map())
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const isUploading = isSingleUploading || isBatchUploading
  const hasValidFiles = selectedFiles.length > 0 && Array.from(validationResults.values()).every(result => result.isValid)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="space-y-4">
          <div className="text-4xl text-gray-400">
            📁
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Media Files
            </h3>
            <p className="text-gray-600">
              Drag and drop files here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                browse to select
              </button>
            </p>
          </div>

          <div className="text-sm text-gray-500 space-y-1">
            <p>Accepted formats: {acceptedTypes.join(', ')}</p>
            <p>Maximum file size: {Math.round(maxFileSize / (1024 * 1024))}MB</p>
            <p>Maximum files: {maxFiles}</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={enableBatch}
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">
              Selected Files ({selectedFiles.length})
            </h4>
            <button
              onClick={clearFiles}
              disabled={isUploading}
              className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>

          {enablePreview && (
            <div className="space-y-3">
              {selectedFiles.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={() => removeFile(index)}
                  validationResult={validationResults.get(file.name)}
                />
              ))}
            </div>
          )}

          {/* Upload Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {hasValidFiles ? (
                <span className="text-green-600">✅ All files are valid</span>
              ) : (
                <span className="text-red-600">❌ Please fix validation errors</span>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!hasValidFiles || isUploading || isValidating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUploading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>
                {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-3">
          {isSingleUploading && (
            <UploadProgress
              progress={singleProgress}
              fileName={selectedFiles[0]?.name}
              error={singleError?.message}
            />
          )}

          {isBatchUploading && (
            <UploadProgress
              progress={batchProgress.progress}
              fileName={batchProgress.current}
              error={batchError?.message}
            />
          )}
        </div>
      )}

      {/* Batch Results */}
      {batchResults.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Upload Results</h4>
          <div className="space-y-2">
            {batchResults.map((result, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                {result instanceof Error ? (
                  <>
                    <span className="text-red-600">❌</span>
                    <span className="text-gray-600">{selectedFiles[index]?.name}</span>
                    <span className="text-red-600">- {result.message}</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-600">✅</span>
                    <span className="text-gray-600">{result.originalName}</span>
                    <span className="text-green-600">- Uploaded successfully</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}