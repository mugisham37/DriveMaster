export interface KnowledgeState {
  userId: string
  conceptId: string
  masteryProbability: number
  initialKnowledge: number
  learningRate: number
  guessParameter: number
  slipParameter: number
  learningVelocity: number
  confidenceWeight: number
  responseTimeWeight: number
  decayRate: number
  lastUpdated: Date
  updateCount: number
  evidenceHistory: number[]
}

export interface UserResponse {
  userId: string
  conceptId: string
  questionId: string
  isCorrect: boolean
  responseTime?: number
  confidence?: number
  attempts?: number
  sessionId: string
  timestamp: Date
}

export interface MasteryProbability {
  probability: number
  confidenceInterval: {
    lower: number
    upper: number
  }
  evidence: number
  lastUpdated: Date
}

export interface ConceptGraph {
  conceptId: string
  name: string
  category: string
  prerequisites: ConceptDependency[]
  difficulty: number
  isActive: boolean
}

export interface ConceptDependency {
  prerequisite: string
  weight: number
  type: 'hard' | 'soft' // hard = must master, soft = helpful to master
}

export interface LearningContext {
  userId: string
  sessionId: string
  sessionGoals: string[]
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  deviceType: 'mobile' | 'tablet' | 'desktop'
  networkCondition: 'fast' | 'slow' | 'offline'
  availableTime: number // minutes
  currentStreak: number
  fatigueLevel: number // 0-1 scale
}

export interface PersonalizedSchedule {
  userId: string
  conceptId: string
  nextReviewTime: Date
  priority: number
  estimatedDuration: number
  difficulty: number
  reviewType: 'initial' | 'review' | 'mastery_check'
}

export interface CognitiveProfile {
  userId: string
  learningSpeed: 'slow' | 'average' | 'fast'
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive'
  confidenceCorrelation: 'low' | 'medium' | 'high'
  responseTimeCorrelation: 'low' | 'medium' | 'high'
  optimalSessionLength: number // minutes
  peakPerformanceHours: number[] // hours of day (0-23)
  forgettingCurveRate: number
  motivationFactors: string[]
  lastUpdated: Date
}

export interface BKTServiceInterface {
  // Core BKT operations
  updateKnowledgeState(response: UserResponse): Promise<KnowledgeState>
  getMasteryProbability(userId: string, conceptId: string): Promise<MasteryProbability>
  predictPerformance(userId: string, conceptId: string): Promise<number>

  // Concept dependency management
  getConceptDependencies(conceptId: string): Promise<ConceptDependency[]>
  updateConceptGraph(conceptGraph: ConceptGraph): Promise<void>

  // User profile management
  getCognitiveProfile(userId: string): Promise<CognitiveProfile>
  updateCognitiveProfile(userId: string, profile: Partial<CognitiveProfile>): Promise<void>

  // Analytics and insights
  getLearningProgress(userId: string, timeWindow?: number): Promise<LearningProgress>
  getWeakConcepts(userId: string, threshold?: number): Promise<ConceptMastery[]>
  getReadyConcepts(userId: string): Promise<ConceptMastery[]>
}

export interface LearningProgress {
  userId: string
  overallProgress: number
  conceptProgress: ConceptMastery[]
  learningVelocity: number
  streakDays: number
  totalTimeSpent: number
  averageAccuracy: number
  improvementRate: number
  predictedCompletionDate: Date
}

export interface ConceptMastery {
  conceptId: string
  conceptName: string
  masteryLevel: number
  confidence: number
  lastPracticed: Date
  practiceCount: number
  averageResponseTime: number
  difficulty: number
  status: 'not_started' | 'learning' | 'reviewing' | 'mastered'
}

export interface BKTConfig {
  defaultParams: {
    pL0: number
    pT: number
    pG: number
    pS: number
    decayRate: number
    learningVelocity: number
    confidenceWeight: number
    responseTimeWeight: number
  }
  convergenceThreshold: number
  masteryThreshold: number
  maxUpdateHistory: number
  temporalDecayEnabled: boolean
  adaptiveParametersEnabled: boolean
}
