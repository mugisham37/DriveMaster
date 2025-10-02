import { MLInferenceEngine, InferenceResult } from './inference-engine'
import {
  VectorSearchEngine,
  RecommendationQuery,
  SimilarityResult,
  ContentType,
} from './vector-engine'

export interface MLServiceConfig {
  pineconeApiKey: string
  pineconeEnvironment: string
  modelBasePath: string
  enableModelDrift: boolean
  enableABTesting: boolean
}

export interface EnhancedRecommendation {
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
}

export interface MLInsights {
  dropoutRisk: number
  learningVelocity: number
  optimalStudyTime: string
  recommendedDifficulty: number
  strongConcepts: string[]
  weakConcepts: string[]
  nextMilestone: string
}

export interface UserProfile {
  createdAt?: Date
  totalSessions?: number
  avgSessionLength?: number
  overallAccuracy?: number
  avgMastery?: number
  conceptsCompleted?: number
  currentStreak?: number
  maxStreak?: number
  achievementsUnlocked?: number
  preferredTimeOfDay?: number
  avgResponseTime?: number
  helpRequestFrequency?: number
  friendsCount?: number
  socialInteractions?: number
}

export interface RecentActivity extends Record<string, unknown> {
  createdAt: Date | string
  masteryAfter?: number | null
  masteryBefore?: number | null
}

export interface KnowledgeState {
  currentMastery?: number
  learningVelocity?: number
  totalInteractions?: number
  correctAnswers?: number
  pL0?: number
  pT?: number
  pG?: number
  pS?: number
  decayRate?: number
  lastInteraction?: Date
}

export interface ContextualInfo {
  fatigueLevel?: number
  studyStreak?: number
  sessionLength?: number
  conceptDifficulty?: number
  avgResponseTime?: number
  avgConfidence?: number
  recentEngagement?: number
  completionRate?: number
  preferredContentType?: string
}

export interface ConceptMastery {
  concept: string
  mastery: number
}

export class MLService {
  private inferenceEngine: MLInferenceEngine
  private vectorEngine: VectorSearchEngine
  private config: MLServiceConfig
  private initialized = false

  constructor(config?: Partial<MLServiceConfig>) {
    this.config = {
      pineconeApiKey: config?.pineconeApiKey ?? process.env.PINECONE_API_KEY ?? '',
      pineconeEnvironment:
        config?.pineconeEnvironment ?? process.env.PINECONE_ENVIRONMENT ?? 'us-west1-gcp',
      modelBasePath: config?.modelBasePath ?? process.env.ML_MODEL_PATH ?? './models',
      enableModelDrift: config?.enableModelDrift ?? true,
      enableABTesting: config?.enableABTesting ?? true,
    }

    this.inferenceEngine = new MLInferenceEngine()
    this.vectorEngine = new VectorSearchEngine(
      this.config.pineconeApiKey,
      this.config.pineconeEnvironment,
    )
  }

  /**
   * Initialize ML service with models and vector indexes
   */
  async initialize(): Promise<void> {
    // Initialize vector search engine
    await this.vectorEngine.initialize()

    // Load ML models
    await this.loadModels()

    this.initialized = true
  }

  /**
   * Load all ML models
   */
  private async loadModels(): Promise<void> {
    // Load learning outcome prediction model
    await this.inferenceEngine.loadModel(
      `${this.config.modelBasePath}/learning-outcome/model.json`,
      {
        id: 'learning-outcome-predictor',
        name: 'Learning Outcome Predictor',
        version: '1.0.0',
        type: 'classification',
        inputShape: [15], // Number of features
        outputShape: [1],
        metadata: {
          accuracy: 0.87,
          f1Score: 0.84,
          trainingDate: new Date('2024-01-15'),
          features: [
            'currentMastery',
            'learningVelocity',
            'totalInteractions',
            'accuracyRate',
            'pL0',
            'pT',
            'pG',
            'pS',
            'decayRate',
            'timeOfDay',
            'dayOfWeek',
            'hoursSinceLastInteraction',
            'fatigueLevel',
            'studyStreak',
            'sessionLength',
          ],
          description: 'Predicts probability of successful learning outcome',
        },
      },
    )

    // Load difficulty optimization model
    await this.inferenceEngine.loadModel(
      `${this.config.modelBasePath}/difficulty-optimizer/model.json`,
      {
        id: 'difficulty-optimizer',
        name: 'Difficulty Optimizer',
        version: '1.0.0',
        type: 'regression',
        inputShape: [15],
        outputShape: [1],
        metadata: {
          accuracy: 0.82,
          trainingDate: new Date('2024-01-15'),
          features: [
            'currentMastery',
            'learningVelocity',
            'totalInteractions',
            'accuracyRate',
            'pL0',
            'pT',
            'pG',
            'pS',
            'decayRate',
            'timeOfDay',
            'dayOfWeek',
            'hoursSinceLastInteraction',
            'fatigueLevel',
            'studyStreak',
            'sessionLength',
          ],
          description: 'Predicts optimal difficulty level for maximum learning',
        },
      },
    )

    // Load dropout prediction model
    await this.inferenceEngine.loadModel(
      `${this.config.modelBasePath}/dropout-predictor/model.json`,
      {
        id: 'dropout-predictor',
        name: 'Dropout Risk Predictor',
        version: '1.0.0',
        type: 'classification',
        inputShape: [18], // Different feature set for dropout prediction
        outputShape: [1],
        metadata: {
          accuracy: 0.91,
          f1Score: 0.88,
          trainingDate: new Date('2024-01-15'),
          features: [
            'daysSinceRegistration',
            'totalSessions',
            'avgSessionLength',
            'sessionsLast7Days',
            'sessionsLast30Days',
            'activityTrend',
            'overallAccuracy',
            'avgMastery',
            'conceptsCompleted',
            'streakLength',
            'maxStreak',
            'achievementsUnlocked',
            'preferredTimeOfDay',
            'avgResponseTime',
            'helpRequestFrequency',
            'friendsCount',
            'socialInteractions',
            'engagementScore',
          ],
          description: 'Predicts risk of user dropout within next 7 days',
        },
      },
    )

    // All ML models loaded successfully
  }

  /**
   * Get enhanced content recommendations using ML and vector search
   */
  async getEnhancedRecommendations(
    userId: string,
    conceptKey: string,
    knowledgeState: Record<string, unknown>,
    contextualInfo: Record<string, unknown> = {},
    options: {
      maxItems?: number
      contentType?: string
      targetDifficulty?: number
      excludeIds?: string[]
    } = {},
  ): Promise<EnhancedRecommendation[]> {
    if (!this.initialized) {
      throw new Error('ML Service not initialized')
    }

    // Get vector-based recommendations
    const query: RecommendationQuery = {
      userId,
      conceptKey,
      contentType: options.contentType as ContentType | undefined,
      targetDifficulty: options.targetDifficulty,
      excludeIds: options.excludeIds,
      topK: (options.maxItems ?? 10) * 2, // Get more candidates for ML filtering
    }

    const vectorRecommendations = await this.vectorEngine.getContentRecommendations(query)

    // Enhance recommendations with ML predictions
    const enhancedRecommendations: EnhancedRecommendation[] = []

    for (const item of vectorRecommendations.hybrid) {
      try {
        // Get ML predictions for this item
        const itemContextualInfo: ContextualInfo = {
          ...contextualInfo,
          conceptDifficulty:
            typeof item.metadata.difficulty === 'number' ? item.metadata.difficulty : 0.5,
          // Map contentType to appropriate contextual info if needed
        }

        const [learningOutcome, optimalDifficulty] = await Promise.all([
          this.inferenceEngine
            .predictLearningOutcome(userId, conceptKey, knowledgeState, itemContextualInfo)
            .catch(() => ({ prediction: 0.5, confidence: 0.5 }) as InferenceResult),

          this.inferenceEngine
            .predictOptimalDifficulty(userId, conceptKey, knowledgeState, itemContextualInfo)
            .catch(() => ({ prediction: 0.5, confidence: 0.5 }) as InferenceResult),
        ])

        // Calculate engagement score based on item metadata and user preferences
        const engagementScore = this.calculateEngagementScore(item, knowledgeState, contextualInfo)

        // Combine vector similarity with ML predictions
        const combinedScore = this.combineScores(
          item.score,
          learningOutcome.prediction as number,
          engagementScore,
          Math.abs(
            (optimalDifficulty.prediction as number) -
              (typeof item.metadata.difficulty === 'number' ? item.metadata.difficulty : 0.5),
          ),
        )

        enhancedRecommendations.push({
          itemId: item.id,
          score: combinedScore,
          confidence: (learningOutcome.confidence + optimalDifficulty.confidence) / 2,
          reasoning: this.generateReasoning(
            item,
            learningOutcome,
            optimalDifficulty,
            engagementScore,
          ),
          metadata: item.metadata,
          mlPredictions: {
            learningOutcome: learningOutcome.prediction as number,
            optimalDifficulty: optimalDifficulty.prediction as number,
            engagementScore,
          },
        })
      } catch (error) {
        // Failed to enhance recommendation for item, fallback to vector score only
        enhancedRecommendations.push({
          itemId: item.id,
          score: item.score,
          confidence: 0.5,
          reasoning: 'Based on content similarity',
          metadata: item.metadata,
          mlPredictions: {
            learningOutcome: 0.5,
            optimalDifficulty: 0.5,
            engagementScore: 0.5,
          },
        })
      }
    }

    // Sort by combined score and return top items
    return enhancedRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxItems ?? 10)
  }

  /**
   * Get comprehensive ML insights for a user
   */
  async getUserMLInsights(
    userId: string,
    userProfile: UserProfile,
    knowledgeStates: Record<string, KnowledgeState>,
    recentActivity: RecentActivity[],
  ): Promise<MLInsights> {
    if (!this.initialized) {
      throw new Error('ML Service not initialized')
    }

    // Convert UserProfile to match inference engine expectations
    const inferenceUserProfile = {
      ...userProfile,
      createdAt: userProfile.createdAt ?? new Date(),
    }

    // Predict dropout risk
    const dropoutPrediction = await this.inferenceEngine
      .predictDropoutRisk(userId, inferenceUserProfile, recentActivity)
      .catch(() => ({ prediction: 0.3, confidence: 0.5 }) as InferenceResult)

    // Calculate learning velocity from knowledge states
    const masteryValues = Object.values(knowledgeStates).map((ks) => ks.currentMastery ?? 0)
    const avgMastery =
      masteryValues.length > 0 ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length : 0
    const learningVelocity = this.calculateLearningVelocity(recentActivity)

    // Determine optimal study time based on activity patterns
    const optimalStudyTime = this.determineOptimalStudyTime(recentActivity)

    // Calculate recommended difficulty based on current performance
    const recommendedDifficulty = Math.min(0.9, Math.max(0.1, avgMastery + 0.1))

    // Identify strong and weak concepts
    const conceptMasteries: ConceptMastery[] = Object.entries(knowledgeStates)
      .map(([concept, ks]) => ({
        concept,
        mastery: ks.currentMastery ?? 0,
      }))
      .sort((a, b) => b.mastery - a.mastery)

    const strongConcepts = conceptMasteries
      .filter((c) => c.mastery > 0.7)
      .slice(0, 5)
      .map((c) => c.concept)

    const weakConcepts = conceptMasteries
      .filter((c) => c.mastery < 0.3)
      .slice(0, 5)
      .map((c) => c.concept)

    // Determine next milestone
    const nextMilestone = this.determineNextMilestone(conceptMasteries, userProfile)

    return {
      dropoutRisk: dropoutPrediction.prediction as number,
      learningVelocity,
      optimalStudyTime,
      recommendedDifficulty,
      strongConcepts,
      weakConcepts,
      nextMilestone,
    }
  }

  /**
   * Update user profile in vector database
   */
  async updateUserProfile(
    userId: string,
    learningHistory: RecentActivity[],
    preferences: Record<string, unknown>,
    knowledgeStates: Record<string, number>,
  ): Promise<void> {
    if (!this.initialized) return

    try {
      await this.vectorEngine.updateUserProfile({
        userId,
        learningHistory,
        preferences,
        knowledgeStates,
      })
    } catch (error) {
      // Failed to update user profile
    }
  }

  /**
   * Index new content for vector search
   */
  async indexContent(content: {
    id: string
    title: string
    description: string
    conceptKey: string
    difficulty: number
    contentType: string
    tags: string[]
  }): Promise<void> {
    if (!this.initialized) return

    try {
      const embedding = await this.vectorEngine.generateContentEmbedding(content)
      await this.vectorEngine.indexContent(embedding)
    } catch (error) {
      // Failed to index content
    }
  }

  /**
   * Calculate engagement score based on item and user characteristics
   */
  private calculateEngagementScore(
    item: SimilarityResult,
    knowledgeState: KnowledgeState,
    contextualInfo: ContextualInfo,
  ): number {
    let score = 0.5 // Base score

    // Difficulty alignment
    const userMastery = knowledgeState.currentMastery ?? 0.3
    const itemDifficulty =
      typeof item.metadata.difficulty === 'number' ? item.metadata.difficulty : 0.5
    const difficultyGap = Math.abs(itemDifficulty - (userMastery + 0.1))
    score += (1 - difficultyGap) * 0.3

    // Content type preference
    const preferredType = contextualInfo.preferredContentType ?? 'question'
    if (item.metadata.contentType === preferredType) {
      score += 0.2
    }

    // Recency bonus for new content
    if (item.metadata.createdAt != null) {
      const createdAt = new Date(item.metadata.createdAt as string)
      const daysSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreated < 7) {
        score += 0.1
      }
    }

    return Math.min(1, Math.max(0, score))
  }

  /**
   * Combine multiple scores into final recommendation score
   */
  private combineScores(
    vectorScore: number,
    learningOutcome: number,
    engagementScore: number,
    difficultyAlignment: number,
  ): number {
    return (
      vectorScore * 0.4 +
      learningOutcome * 0.3 +
      engagementScore * 0.2 +
      (1 - difficultyAlignment) * 0.1
    )
  }

  /**
   * Generate human-readable reasoning for recommendation
   */
  private generateReasoning(
    item: SimilarityResult,
    learningOutcome: InferenceResult,
    optimalDifficulty: InferenceResult,
    engagementScore: number,
  ): string {
    const reasons = []

    if (item.score > 0.8) {
      reasons.push('highly similar to your learning profile')
    }

    if ((learningOutcome.prediction as number) > 0.7) {
      reasons.push('high predicted learning success')
    }

    if (engagementScore > 0.7) {
      reasons.push('matches your content preferences')
    }

    const difficultyMatch =
      1 -
      Math.abs(
        (optimalDifficulty.prediction as number) -
          (typeof item.metadata.difficulty === 'number' ? item.metadata.difficulty : 0.5),
      )
    if (difficultyMatch > 0.8) {
      reasons.push('optimal difficulty level')
    }

    return reasons.length > 0
      ? `Recommended because it has ${reasons.join(', ')}`
      : 'Recommended based on content analysis'
  }

  /**
   * Calculate learning velocity from recent activity
   */
  private calculateLearningVelocity(recentActivity: RecentActivity[]): number {
    if (recentActivity.length < 2) return 1.0

    const sortedActivity = recentActivity
      .filter((a) => a.masteryAfter !== undefined && a.masteryBefore !== undefined)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (sortedActivity.length < 2) return 1.0

    const masteryGains = sortedActivity.map((a) => (a.masteryAfter ?? 0) - (a.masteryBefore ?? 0))
    const avgGain =
      masteryGains.length > 0 ? masteryGains.reduce((a, b) => a + b, 0) / masteryGains.length : 0

    return Math.max(0.1, Math.min(3.0, 1 + avgGain * 10))
  }

  /**
   * Determine optimal study time based on activity patterns
   */
  private determineOptimalStudyTime(recentActivity: RecentActivity[]): string {
    const hourCounts: number[] = Array.from({ length: 24 }, () => 0)

    for (const activity of recentActivity) {
      const hour = new Date(activity.createdAt).getHours()
      if (hour >= 0 && hour < 24) {
        const currentCount = hourCounts[hour]
        if (typeof currentCount === 'number') {
          hourCounts[hour] = currentCount + 1
        }
      }
    }

    const maxCount = hourCounts.reduce((max: number, count: number) => Math.max(max, count), 0)
    const peakHour = hourCounts.indexOf(maxCount)
    return `${peakHour}:00`
  }

  /**
   * Determine next learning milestone
   */
  private determineNextMilestone(
    conceptMasteries: ConceptMastery[],
    _userProfile: UserProfile,
  ): string {
    const weakestConcept = conceptMasteries[conceptMasteries.length - 1]

    if (weakestConcept && weakestConcept.mastery < 0.5) {
      return `Master ${weakestConcept.concept} (${Math.round(weakestConcept.mastery * 100)}% complete)`
    }

    const totalMastery =
      conceptMasteries.reduce((sum, c) => sum + c.mastery, 0) / conceptMasteries.length

    if (totalMastery < 0.7) {
      return 'Achieve 70% overall mastery'
    }

    return 'Complete advanced practice scenarios'
  }

  /**
   * Get ML service health status
   */
  getHealthStatus(): {
    initialized: boolean
    modelsLoaded: number
    vectorIndexStats: string
  } {
    return {
      initialized: this.initialized,
      modelsLoaded: this.inferenceEngine.getLoadedModels().length,
      vectorIndexStats: this.initialized ? 'Connected' : 'Not initialized',
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.inferenceEngine.dispose()
    this.vectorEngine.dispose()
    this.initialized = false
  }
}
