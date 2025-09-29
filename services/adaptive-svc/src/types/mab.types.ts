export interface Question {
  id: string
  conceptId: string
  title: string
  difficulty: number
  discrimination: number
  guessParameter: number
  category: string
  estimatedTime: number // seconds
  tags: string[]
  metadata: QuestionMetadata
}

export interface QuestionMetadata {
  createdAt: Date
  updatedAt: Date
  version: number
  isActive: boolean
  authorId: string
  reviewCount: number
  averageRating: number
}

export interface LearningContext {
  userId: string
  sessionId: string
  sessionGoals: string[]
  timeOfDay: string // HH:MM format
  deviceType: 'mobile' | 'tablet' | 'desktop'
  networkCondition: 'fast' | 'slow' | 'offline'
  availableTime: number // minutes
  currentStreak: number
  fatigueLevel: number // 0-1 scale
  previousPerformance: number // recent success rate
  studyStreak: number
  userMastery: number // overall mastery level
}

export interface QuestionSelection {
  question: Question
  expectedReward: number
  sampledValue: number
  selectionReason: string
  contextualFactors: {
    difficultyMatch: number
    zpdReward: number
    engagementReward: number
    progressionReward: number
    fatigueAdjustment: number
    goalAlignment: number
    timeAdjustment: number
  }
}

export interface LearningOutcome {
  questionId: string
  userId: string
  isCorrect: boolean
  responseTime: number
  confidence?: number
  attempts: number
  timestamp: Date
  sessionId: string
  contextData: {
    fatigueLevel: number
    timeOfDay: string
    deviceType: string
  }
}

export interface BanditPerformanceMetrics {
  armId: string
  totalPulls: number
  totalRewards: number
  averageReward: number
  successRate: number
  averageResponseTime: number
  lastPulled: Date
  recentPerformance: number[] // sliding window of recent rewards
  explorationCount: number
  exploitationCount: number
}

export interface SessionOptimization {
  userId: string
  sessionId: string
  optimalSessionLength: number
  recommendedBreakTime: number
  fatigueThreshold: number
  performanceDeclineDetected: boolean
  suggestedDifficultyAdjustment: number
  nextSessionRecommendation: Date
}

export interface FatigueDetection {
  userId: string
  currentFatigueLevel: number
  fatigueIndicators: {
    responseTimeIncrease: number
    accuracyDecrease: number
    confidenceDecrease: number
    sessionDuration: number
  }
  recommendedAction: 'continue' | 'break' | 'easier_content' | 'end_session'
  estimatedRecoveryTime: number // minutes
}

export interface DynamicDifficultyAdjustment {
  userId: string
  currentSuccessRate: number
  targetSuccessRate: number
  difficultyAdjustment: number
  adjustmentReason: string
  confidenceInterval: {
    lower: number
    upper: number
  }
}

export interface MABConfig {
  explorationRate: number
  zpdMinSuccess: number // Zone of Proximal Development min success rate (0.7)
  zpdMaxSuccess: number // Zone of Proximal Development max success rate (0.85)
  engagementWeight: number
  difficultyWeight: number
  freshnessWeight: number
  fatigueThreshold: number
  performanceWindowSize: number
  minQuestionsForStats: number
  conceptDriftThreshold: number
  sessionOptimizationEnabled: boolean
}

export interface ThompsonSamplingResult {
  selectedArm: BanditArm
  sampledValues: Map<string, number>
  explorationRatio: number
  expectedRewards: Map<string, number>
  selectionConfidence: number
}

export interface ContextualBanditFeatures {
  userMastery: number
  timeOfDay: string
  sessionGoal: string
  fatigueLevel: number
  previousPerformance: number
  conceptDifficulty: number
  studyStreak: number
  deviceCapabilities: number
  networkQuality: number
  availableTime: number
}

export interface BanditArm {
  id: string
  conceptKey: string
  difficulty: number
  discrimination?: number
  engagement?: number
}

export interface BanditArmStats {
  alphaSuccess: number
  betaFailure: number
  totalPulls: number
  totalRewards: number
  avgReward: number
  lastPulled?: Date
}

export interface MABServiceInterface {
  // Core MAB operations
  selectOptimalQuestion(
    userId: string,
    availableQuestions: Question[],
    context: LearningContext,
  ): Promise<QuestionSelection>

  updateRewardModel(userId: string, questionId: string, outcome: LearningOutcome): Promise<void>

  // Dynamic difficulty adjustment
  adjustDifficulty(
    userId: string,
    currentPerformance: number[],
  ): Promise<DynamicDifficultyAdjustment>

  // Fatigue detection and session optimization
  detectFatigue(userId: string, sessionData: LearningOutcome[]): Promise<FatigueDetection>

  optimizeSession(
    userId: string,
    sessionId: string,
    sessionData: LearningOutcome[],
  ): Promise<SessionOptimization>

  // Performance tracking
  getPerformanceMetrics(userId: string, questionId?: string): Promise<BanditPerformanceMetrics[]>

  getExplorationRatio(userId: string): Promise<{ exploration: number; exploitation: number }>

  // Algorithm management
  resetBanditStats(userId: string, decayFactor?: number): Promise<void>
  detectConceptDrift(userId: string): Promise<boolean>
}

export interface MABAnalytics {
  userId: string
  totalQuestions: number
  averageReward: number
  explorationRate: number
  optimalityGap: number
  cumulativeRegret: number
  convergenceRate: number
  algorithmEfficiency: number
  userSatisfaction: number
  learningVelocity: number
}

export interface QuestionRecommendationEngine {
  userId: string
  recommendedQuestions: Question[]
  recommendationReasons: string[]
  confidenceScores: number[]
  diversityScore: number
  personalizedRanking: number[]
}
