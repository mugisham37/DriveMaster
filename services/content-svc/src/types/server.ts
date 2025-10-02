// Server-specific type definitions

import { FastifyRequest, FastifyReply } from 'fastify'

// Authentication types
export interface AuthenticatedUser {
  userId: string
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  email?: string
  permissions?: string[]
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser
  jwtVerify(): Promise<void>
}

// Request/Response types
export interface PaginatedQuery {
  limit?: string
  offset?: string
  page?: string
}

export interface CategoryQuery extends PaginatedQuery {
  includeInactive?: string
}

export interface ConceptQuery extends PaginatedQuery {
  categoryId?: string
  includeInactive?: string
  difficulty?: string
}

export interface ItemQuery extends PaginatedQuery {
  conceptId?: string
  categoryId?: string
  difficulty?: string
  itemType?: string
  status?: string
  includeInactive?: string
}

export interface AnalyticsQuery {
  period?: string
  days?: string
}

export interface CDNAnalyticsQuery {
  startDate: string
  endDate: string
  granularity?: string
}

// Route parameter types
export interface CategoryParams {
  key: string
}

export interface ConceptParams {
  key: string
}

export interface ItemParams {
  slug: string
}

export interface ConceptPrerequisiteParams {
  conceptId: string
}

export interface ABTestParams {
  testId: string
}

export interface AnalyticsParams {
  entityType: string
  entityId: string
}

export interface MediaParams {
  mediaAssetId: string
}

export interface ItemPreloadParams {
  itemId: string
}

// Request body types
export interface ConceptPrerequisiteBody {
  prerequisiteId: string
  weight?: number
  isRequired?: boolean
}

export interface TrackInteractionBody {
  itemId: string
  conceptId: string
  eventType: string
  isCorrect?: boolean
  responseTime?: number
  confidence?: number
  hintsUsed?: number
  attemptsCount?: number
  engagementScore?: number
  deviceType?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

export interface MediaOptimizeBody {
  deviceCapabilities: DeviceCapabilities
  networkConditions: NetworkConditions
  options?: Partial<ContentDeliveryOptions>
}

export interface MediaCompressBody {
  targetSize: string
  deviceCapabilities: DeviceCapabilities
}

export interface CDNPurgeBody {
  urls?: string[]
  tags?: string[]
  hosts?: string[]
  prefixes?: string[]
}

export interface SyncValidateBody {
  offlineContent: unknown
}

export interface ResponsiveImageQuery {
  breakpoints?: string
  format?: string
  quality?: string
}

// Device and network types
export interface DeviceCapabilities {
  screenWidth: number
  screenHeight: number
  pixelDensity: number
  supportsWebP: boolean
  supportsAVIF: boolean
  supportsVideo: boolean
  maxVideoResolution: '480p' | '720p' | '1080p' | '4k'
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi'
  bandwidth: number
  isLowEndDevice: boolean
  supportedCodecs: string[]
}

export interface NetworkConditions {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  downlink: number
  rtt: number
  saveData: boolean
}

export interface ContentDeliveryOptions {
  quality: 'low' | 'medium' | 'high' | 'auto'
  format: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto'
  maxWidth: number | undefined
  maxHeight: number | undefined
  progressive: boolean
  lazy: boolean
  preload: boolean
}

// Service configuration types
export interface ElasticsearchConfig {
  node: string
  auth:
    | {
        username: string
        password: string
      }
    | undefined
}

export interface CDNConfig {
  baseUrl: string
  apiKey: string | undefined
  zoneId: string | undefined
}

// Error types
export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

// Middleware types
export type AuthMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

export type AdminMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>

// Response types
export interface SuccessResponse<T = unknown> {
  success: true
  data?: T
}

export interface ErrorResponse {
  success: false
  error: string
  details?: unknown
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

// Search types
export interface SearchQuery {
  query: string
  entityTypes: ('item' | 'concept' | 'category')[] | undefined
  categoryKeys: string[] | undefined
  conceptKeys: string[] | undefined
  difficulty:
    | {
        min: number
        max: number
      }
    | undefined
  tags: string[] | undefined
  itemTypes: string[] | undefined
  limit: number
  offset: number
  sortBy: 'relevance' | 'difficulty' | 'popularity' | 'created' | 'updated'
  sortOrder: 'asc' | 'desc'
}

export interface SearchRequest {
  query: string
  entityTypes: ('category' | 'concept' | 'item')[] | undefined
  categoryKeys: string[] | undefined
  conceptKeys: string[] | undefined
  difficulty:
    | {
        min: number
        max: number
      }
    | undefined
  tags: string[] | undefined
  itemTypes: string[] | undefined
  limit: number
  offset: number
  sortBy: 'relevance' | 'difficulty' | 'popularity' | 'created' | 'updated'
  sortOrder: 'asc' | 'desc'
}

// Recommendation types
export interface RecommendationContext {
  userId: string
  currentConceptId: string | undefined
  sessionGoals: string[] | undefined
  timeAvailable: number | undefined
  deviceType: string | undefined
  previousItems: string[] | undefined
  targetDifficulty: number | undefined
}

// Sync types
export interface SyncOptions {
  categories: string[] | undefined
  concepts: string[] | undefined
  maxSize: number | undefined
  priority: 'critical' | 'high' | 'medium' | 'low'
  includeMedia: boolean
  compressionLevel: 'low' | 'medium' | 'high'
  networkConditions: NetworkConditions
  deviceCapabilities: DeviceCapabilities
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
  title?: string | undefined
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
  dimensions?: { width: number; height: number } | undefined
  checksum: string
}

export interface SyncManifest {
  version: string
  timestamp: Date
  categories: SyncCategory[]
  totalSize: number
  estimatedSyncTime: number
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export interface OfflineContent {
  manifest: SyncManifest
  lastSync: Date
  expiresAt: Date
  size: number
  items: Map<string, SyncItem>
  mediaAssets: Map<string, SyncMediaAsset>
}

// A/B Testing types
export interface CreateABTestRequest {
  name: string
  description?: string
  hypothesis: string
  variants: Record<
    string,
    {
      name: string
      description?: string
      trafficPercentage: number
      changes?: unknown
    }
  >
  targetConcepts?: string[]
  targetUsers?: string[]
  startDate?: Date
  endDate?: Date
}

// Category types
export interface CreateCategoryRequest {
  key: string
  name: string
  description?: string
  icon?: string
  color?: string
  parentId?: string
  order: number
  metadata?: Record<string, unknown>
}

// Concept types
export interface CreateConceptRequest {
  key: string
  name: string
  description?: string
  categoryId: string
  learningGoals: string[]
  difficulty: number
  estimatedTime?: number
  order: number
  tags: string[]
  metadata?: Record<string, unknown>
}

// Item types
export interface CreateItemRequest {
  title?: string
  body: string
  explanation?: string
  conceptId: string
  type:
    | 'MULTIPLE_CHOICE'
    | 'TRUE_FALSE'
    | 'SCENARIO'
    | 'FILL_BLANK'
    | 'MATCHING'
    | 'ORDERING'
    | 'INTERACTIVE'
  difficulty: number
  difficultyLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  estimatedTime?: number
  options: Record<string, unknown>
  correctAnswer: unknown
  points: number
  hints: string[]
  feedback: Record<string, unknown>
  tags: string[]
  keywords: string[]
  metadata?: Record<string, unknown>
  abTestVariant?: string
}
