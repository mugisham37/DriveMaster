import type { db } from '../db/connection.js'

// Database query result types
export type CategoryWithRelations = Awaited<ReturnType<typeof db.query.categories.findFirst>> & {
  concepts: ConceptWithItems[]
}

export type ConceptWithItems = Awaited<ReturnType<typeof db.query.concepts.findFirst>> & {
  items: ItemWithMediaAssets[]
}

export type ItemWithMediaAssets = Awaited<ReturnType<typeof db.query.items.findFirst>> & {
  mediaAssets: Array<{
    mediaAsset: MediaAssetRecord
  }>
}

export type MediaAssetRecord = Awaited<ReturnType<typeof db.query.mediaAssets.findFirst>>

// Utility types for safe property access
export type SafeCategory = {
  id: string
  key: string
  name: string
  description?: string | null
  concepts: SafeConcept[]
}

export type SafeConcept = {
  id: string
  key: string
  name: string
  description?: string | null
  difficulty: number
  estimatedTime?: number | null
  items: SafeItem[]
}

export type SafeItem = {
  id: string
  slug: string
  title?: string | null
  body: string
  type: string
  difficulty: number
  options?: Record<string, unknown> | null
  correctAnswer?: unknown
  mediaAssets: SafeMediaAsset[]
}

export type SafeMediaAsset = {
  id: string
  filename: string
  storageUrl: string
  cdnUrl?: string | null
  type: string
  size: number
  width?: number | null
  height?: number | null
}

// Type guards for safe type checking
export function isCategoryWithRelations(obj: unknown): obj is CategoryWithRelations {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'key' in obj &&
    'name' in obj &&
    'concepts' in obj
  )
}

export function isConceptWithItems(obj: unknown): obj is ConceptWithItems {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'key' in obj &&
    'name' in obj &&
    'items' in obj
  )
}

export function isItemWithMediaAssets(obj: unknown): obj is ItemWithMediaAssets {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'slug' in obj &&
    'body' in obj &&
    'mediaAssets' in obj
  )
}

export function isMediaAssetRecord(obj: unknown): obj is MediaAssetRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'filename' in obj &&
    'storageUrl' in obj &&
    'type' in obj &&
    'size' in obj
  )
}

// Helper functions for safe property access
export function safeGetNumber(value: unknown, defaultValue = 0): number {
  return typeof value === 'number' && !isNaN(value) ? value : defaultValue
}

export function safeGetString(value: unknown, defaultValue = ''): string {
  return typeof value === 'string' ? value : defaultValue
}

export function safeGetOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && !isNaN(value) ? value : null
}

export function safeGetOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null
}
