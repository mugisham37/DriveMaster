// Content Service Type Definitions

export interface ContentRecommendation {
  itemId: string
  score: number
  reason: string
  confidence: number
  metadata: {
    difficulty: number | null
    estimatedTime: number
    contentType:
      | 'MULTIPLE_CHOICE'
      | 'TRUE_FALSE'
      | 'SCENARIO'
      | 'FILL_BLANK'
      | 'MATCHING'
      | 'ORDERING'
      | 'INTERACTIVE'
      | null
    conceptKey: string
    categoryKey: string
  }
}

export interface UserProfile {
  userId: string
  skillLevel: number
  preferredDifficulty: number
  difficultyPreference: number
  learningStyle: string
  completedConcepts: string[]
  weakAreas: string[]
  strongAreas: string[]
  averageResponseTime: number
  engagementScore: number
  successRate: number
  avgResponseTime: number
  preferredContentTypes: string[]
  weakConcepts: string[]
  strongConcepts: string[]
  studyPatterns: {
    preferredTimeOfDay: string
    sessionDuration: number
    frequency: number
  }
}

export interface ConceptPerformance {
  conceptId: string
  averageScore: number
  totalAttempts: number
  successRate: number
  trend: 'improving' | 'declining' | 'stable'
}

export interface OptimizationSuggestion {
  itemId: string
  type: 'difficulty' | 'content' | 'format' | 'engagement' | 'accessibility'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  suggestedChanges: string[]
  expectedImpact: {
    successRate: number
    engagementScore: number
    completionRate: number
  }
  confidence: number
  dataPoints: number
}

export interface ABTestRecommendation {
  testName: string
  hypothesis: string
  variants: Array<{
    name: string
    description: string
    changes: Record<string, unknown>
  }>
  expectedImpact: number
  confidence: number
}

export interface SyncItem {
  id: string
  slug: string
  title: string
  body: string
  type: string
  conceptId: string
  conceptKey: string
  conceptName: string
  difficulty: number | null
  estimatedTime: number | null
  options: unknown
  correctAnswer: unknown
  mediaAssets?: SyncMediaAsset[]
}

export interface SyncConcept {
  id: string
  key: string
  name: string
  items: SyncItem[]
}

export interface SyncCategory {
  id: string
  key: string
  name: string
  concepts: SyncConcept[]
}

export interface SyncMediaAsset {
  id: string
  url: string
  optimizedUrl: string
  type: string
  size: number
  format: string
  dimensions?: {
    width: number
    height: number
  }
  checksum: string
}

export interface PreloadManifest {
  version: string
  categories: SyncCategory[]
  totalSize: number
  checksum: string
  generatedAt: string
}

export interface SearchFilters {
  conceptId?: string
  categoryId?: string
  difficulty?: {
    min?: number
    max?: number
  }
  type?: string
  status?: string
  tags?: string[]
}

export interface SearchOptions {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

export interface AnalyticsTimeRange {
  startDate: Date
  endDate: Date
}

export interface ContentMetrics {
  totalViews: number
  uniqueUsers: number
  totalAttempts: number
  successfulAttempts: number
  avgResponseTime: number
  engagementScore: number
  dropOffRate: number
}

export interface PerformanceMetrics {
  successRate: number
  avgResponseTime: number
  engagementScore: number
  difficultyRating: number
  completionRate: number
}

// ContentEffectivenessMetrics is defined in content-analytics.service.ts

// ContentOptimizationReport is defined locally in content-optimization.service.ts

// Database result types
export type DatabaseItem = {
  id: string
  slug: string
  title: string | null
  body: string
  type:
    | 'MULTIPLE_CHOICE'
    | 'TRUE_FALSE'
    | 'SCENARIO'
    | 'FILL_BLANK'
    | 'MATCHING'
    | 'ORDERING'
    | 'INTERACTIVE'
    | null
  difficulty: number | null
  estimatedTime: number | null
  points: number | null
  options: unknown
  correctAnswer: unknown
  conceptId: string
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED' | 'DEPRECATED' | null
  isActive: boolean | null
  tags: string[] | null
  keywords: string[] | null
  metadata: unknown
  createdAt: Date | null
  updatedAt: Date | null
  concept?: {
    id: string
    key: string
    name: string
    categoryId: string
  }
}

export type DatabaseConcept = {
  id: string
  key: string
  name: string
  description: string | null
  categoryId: string
  difficulty: number | null
  estimatedTime: number | null
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED' | 'DEPRECATED' | null
  isActive: boolean | null
  tags: string[] | null
  metadata: unknown
  createdAt: Date | null
  updatedAt: Date | null
}

export type DatabaseCategory = {
  id: string
  key: string
  name: string
  description: string | null
  parentId: string | null
  isActive: boolean | null
  metadata: unknown
  createdAt: Date | null
  updatedAt: Date | null
}

export type DatabaseMediaAsset = {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  storageUrl: string
  cdnUrl: string | null
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'ANIMATION' | 'SIMULATION'
  isActive: boolean | null
  metadata: unknown
  createdAt: Date | null
  updatedAt: Date | null
}
