import { CacheOptions, CacheEntry } from './types'

export function createCacheKey(key: string, options: CacheOptions = {}): string {
  let cacheKey = key

  if (options.version) {
    cacheKey += `:v:${options.version}`
  }

  if (options.tags && options.tags.length > 0) {
    cacheKey += `:t:${options.tags.sort().join(',')}`
  }

  return cacheKey
}

export function parseCacheKey(cacheKey: string): {
  key: string
  version?: string
  tags?: string[]
} {
  const parts = cacheKey.split(':')
  const result: { key: string; version?: string; tags?: string[] } = {
    key: parts[0],
  }

  for (let i = 1; i < parts.length; i += 2) {
    const prefix = parts[i]
    const value = parts[i + 1]

    if (prefix === 'v') {
      result.version = value
    } else if (prefix === 't') {
      result.tags = value.split(',')
    }
  }

  return result
}

export function isExpired<T>(entry: CacheEntry<T>): boolean {
  if (entry.ttl === -1) return false // Never expires
  return Date.now() > entry.createdAt + entry.ttl * 1000
}

export function serializeValue<T>(value: T): string {
  return JSON.stringify(value)
}

export function deserializeValue<T>(data: string): T {
  return JSON.parse(data)
}

export function generateCacheKeyHash(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

export function calculateCacheHitRatio(hits: number, misses: number): number {
  const total = hits + misses
  return total === 0 ? 0 : (hits / total) * 100
}

export function formatCacheSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

export function createTTLFromExpiry(expiryDate: Date): number {
  const now = Date.now()
  const expiry = expiryDate.getTime()
  return Math.max(0, Math.floor((expiry - now) / 1000))
}

export function validateCacheKey(key: string): boolean {
  // Redis key constraints
  if (key.length === 0 || key.length > 512) return false

  // Avoid problematic characters
  const problematicChars = /[\s\n\r\t]/
  return !problematicChars.test(key)
}
