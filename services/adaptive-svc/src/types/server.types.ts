import type { FastifyRequest, FastifyReply } from 'fastify'

// Request/Reply types for Fastify
export interface AuthenticatedRequest extends Omit<FastifyRequest, 'user'> {
  user?: {
    userId: string
    [key: string]: unknown
  }
}

export interface AuthenticatedReply extends FastifyReply {}

// Database types matching Prisma schema
export interface UserKnowledgeState {
  userId: string
  conceptKey: string
  pL0: number
  pT: number
  pG: number
  pS: number
  currentMastery: number
  learningVelocity: number
  confidenceWeight: number
  responseTimeWeight: number
  decayRate: number
  totalInteractions: number
  correctAnswers: number
  lastInteraction: Date
  createdAt: Date
  updatedAt: Date
}

export interface BanditArmStats {
  userId: string
  conceptKey: string
  itemId: string
  alphaSuccess: number
  betaFailure: number
  totalPulls: number
  totalRewards: number
  avgReward: number
  lastPulled: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface LearningEvent {
  id: string
  userId: string
  conceptKey: string
  itemId: string | null
  sessionId: string | null
  correct: boolean
  responseMs: number | null
  confidence: number | null
  attempts: number
  difficulty: number | null
  itemType: string | null
  contextualInfo: Record<string, unknown>
  masteryBefore: number | null
  masteryAfter: number | null
  createdAt: Date
  updatedAt: Date
}

export interface SpacedRepetition {
  userId: string
  conceptKey: string
  itemId: string
  easeFactor: number
  interval: number
  repetitions: number
  forgettingCurve: number
  interference: Record<string, unknown>
  nextReview: Date
  lastReview: Date | null
  totalReviews: number
  successRate: number
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  preferences: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

// API Request/Response types
export interface LearningEventRequest {
  userId: string
  conceptKey: string
  itemId?: string
  sessionId?: string
  correct: boolean
  responseMs?: number
  confidence?: number
  attempts?: number
  difficulty?: number
  itemType?: 'multiple_choice' | 'true_false' | 'scenario'
  contextualInfo?: Record<string, unknown>
}

export interface RecommendationRequest {
  userId: string
  conceptKey: string
  sessionId?: string
  sessionGoal?: string
  maxItems?: number
  contextualInfo?: {
    timeOfDay?: string
    deviceType?: string
    studyStreak?: number
    fatigueLevel?: number
  }
}

export interface SpacedRepetitionRequest {
  userId: string
  conceptKey: string
  itemId: string
  quality: number
  responseTime: number
  confidence?: number
  difficulty?: number
}

export interface ContentIndexRequest {
  id: string
  title: string
  description?: string
  conceptKey: string
  difficulty?: number
  contentType?: string
  tags?: string[]
}

// Response types
export interface LearningEventResponse {
  eventId: string
  masteryBefore: number
  masteryAfter: number
  evidence: number
  learningRate: number
}

export interface RecommendationResponse {
  itemId: string
  expectedSuccessRate: number
  difficulty: number
  engagement: number
  recommendation: {
    confidence: number
    reasoning: string
    userMastery: number
    decisionId: string
  }
}

export interface SpacedRepetitionResponse {
  nextReview: Date
  interval: number
  easeFactor: number
  repetitions: number
  confidence: number
  reviewBurden: number
}

export interface KnowledgeStateResponse {
  userId: string
  conceptKey: string
  currentMastery: number
  parameters: {
    pL0: number
    pT: number
    pG: number
    pS: number
    decayRate: number
    learningVelocity: number
  }
  statistics: {
    totalInteractions: number
    correctAnswers: number
    accuracyRate: number
    lastInteraction: Date
    learningRate: number
  }
  recentEvents: Array<{
    id: string
    correct: boolean
    responseTime: number | null
    confidence: number | null
    masteryBefore: number | null
    masteryAfter: number | null
    createdAt: Date
  }>
}

export interface DueReviewsResponse {
  totalDue: number
  reviews: Array<{
    conceptKey: string
    itemId: string
    nextReview: Date
    urgency: number
    repetitions: number
    interval: number
    successRate: number
  }>
}

export interface MLRecommendationResponse {
  recommendations: Array<{
    itemId: string
    score: number
    confidence: number
    reasoning: string
    metadata: Record<string, unknown>
    mlPredictions: {
      learningOutcome: number
      optimalDifficulty: number
      engagementScore: number
    }
  }>
  source: string
  timestamp: string
}

export interface MLInsightsResponse {
  userId: string
  insights: {
    dropoutRisk: number
    learningVelocity: number
    optimalStudyTime: string
    recommendedDifficulty: number
    strongConcepts: string[]
    weakConcepts: string[]
    nextMilestone: string
  }
  generatedAt: string
}

export interface HealthResponse {
  status: string
  timestamp: string
  database: string
  redis: string
  kafka: string
  mlService: {
    initialized: boolean
    modelsLoaded: number
    vectorIndexStats: string
  }
}

// Error response type
export interface ErrorResponse {
  error: string
  details?: unknown
}

// Validation error type
export interface ValidationErrorResponse {
  error: string
  details: Array<{
    code: string
    expected: string
    received: string
    path: (string | number)[]
    message: string
  }>
}
