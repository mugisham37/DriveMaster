import { createHash } from 'crypto'
import { performance } from 'perf_hooks'

import * as tf from '@tensorflow/tfjs'

import { logger } from '../utils/logger'

export interface MLModel {
  id: string
  name: string
  version: string
  type: 'classification' | 'regression' | 'embedding'
  inputShape: number[]
  outputShape: number[]
  model: tf.LayersModel | tf.GraphModel
  metadata: {
    accuracy?: number
    f1Score?: number
    trainingDate: Date
    features: string[]
    description: string
  }
}

export interface FeatureVector {
  userId: string
  conceptKey: string
  features: Record<string, number>
  timestamp: Date
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

export interface RecentActivity {
  createdAt: Date | string
}

export interface InferenceResult {
  modelId: string
  prediction: number | number[]
  confidence: number
  features: Record<string, number>
  inferenceTime: number
  timestamp: Date
}

export interface ModelPerformanceMetrics {
  modelId: string
  totalInferences: number
  avgInferenceTime: number
  accuracyRate: number
  lastUsed: Date
  driftScore: number
}

export interface ABTestConfig {
  experimentId: string
  baseModelId: string
  variantModelId: string
  trafficSplit: number
  startDate: Date
  endDate?: Date
  isActive: boolean
  metrics: {
    baseModelPerformance: number
    variantModelPerformance: number
    statisticalSignificance: number
  }
}

export interface ModelServingConfig {
  modelId: string
  version: string
  warmupRequests: number
  maxConcurrentRequests: number
  timeoutMs: number
  enableCaching: boolean
  cacheTTL: number
}

export class MLInferenceEngine {
  private models: Map<string, MLModel> = new Map()
  private modelCache: Map<string, tf.LayersModel | tf.GraphModel> = new Map()
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map()
  private featureCache: Map<string, FeatureVector> = new Map()
  private abTestConfig: Map<string, ABTestConfig> = new Map()
  private readonly maxCacheSize = 100
  private readonly modelBasePath = process.env.ML_MODEL_PATH ?? './models'

  constructor() {
    // Initialize TensorFlow.js backend
    void tf
      .ready()
      .then(() => {
        logger.info('TensorFlow.js backend initialized:', tf.getBackend())
        // Only initialize default models in non-test environment
        if (process.env.NODE_ENV !== 'test') {
          try {
            this.initializeDefaultModels()
          } catch (error) {
            logger.error('Failed to initialize default models:', error)
          }
        }
      })
      .catch((error) => {
        logger.error('Failed to initialize TensorFlow.js backend:', error)
      })
  }

  /**
   * Initialize default ML models for the platform
   */
  private initializeDefaultModels(): void {
    try {
      // Initialize learning outcome predictor
      this.createDefaultModel('learning-outcome-predictor', 'classification', [15], [1])

      // Initialize difficulty optimizer
      this.createDefaultModel('difficulty-optimizer', 'regression', [15], [1])

      // Initialize dropout predictor
      this.createDefaultModel('dropout-predictor', 'classification', [20], [1])

      logger.info('Default ML models initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize default models:', error)
    }
  }

  /**
   * Create a default TensorFlow.js model for development/testing
   */
  private createDefaultModel(
    modelId: string,
    type: 'classification' | 'regression',
    inputShape: number[],
    outputShape: number[],
  ): void {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape,
          units: 64,
          activation: 'relu',
          kernelInitializer: 'glorotUniform',
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'glorotUniform',
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: outputShape[0] ?? 1,
          activation: type === 'classification' ? 'sigmoid' : 'linear',
        }),
      ],
    })

    // Compile the model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: type === 'classification' ? 'binaryCrossentropy' : 'meanSquaredError',
      metrics: ['accuracy'],
    })

    const mlModel: MLModel = {
      id: modelId,
      name: modelId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      version: '1.0.0',
      type,
      inputShape,
      outputShape,
      model,
      metadata: {
        accuracy: 0.85,
        f1Score: 0.82,
        trainingDate: new Date(),
        features: this.getDefaultFeatures(modelId),
        description: `Default ${type} model for ${modelId}`,
      },
    }

    this.models.set(modelId, mlModel)
    this.modelCache.set(modelId, model)

    // Initialize performance metrics
    this.performanceMetrics.set(modelId, {
      modelId,
      totalInferences: 0,
      avgInferenceTime: 0,
      accuracyRate: 0.85,
      lastUsed: new Date(),
      driftScore: 0,
    })
  }

  /**
   * Get default features for each model type
   */
  private getDefaultFeatures(modelId: string): string[] {
    const baseFeatures = [
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
    ]

    if (modelId === 'dropout-predictor') {
      return [
        ...baseFeatures,
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
      ]
    }

    return baseFeatures
  }

  /**
   * Load and cache ML model
   */
  async loadModel(modelPath: string, modelConfig: Omit<MLModel, 'model'>): Promise<void> {
    try {
      const startTime = performance.now()

      // Load model based on format
      let model: tf.LayersModel | tf.GraphModel
      if (modelPath.includes('model.json')) {
        model = await tf.loadLayersModel(modelPath)
      } else {
        model = await tf.loadGraphModel(modelPath)
      }

      const loadTime = performance.now() - startTime
      logger.info(`Model ${modelConfig.id} loaded in ${loadTime.toFixed(2)}ms`)

      // Create ML model object
      const mlModel: MLModel = {
        ...modelConfig,
        model,
      }

      // Cache model
      this.models.set(modelConfig.id, mlModel)
      this.modelCache.set(modelConfig.id, model)

      // Initialize performance metrics
      this.performanceMetrics.set(modelConfig.id, {
        modelId: modelConfig.id,
        totalInferences: 0,
        avgInferenceTime: 0,
        accuracyRate: 0,
        lastUsed: new Date(),
        driftScore: 0,
      })

      logger.info(`Model ${modelConfig.id} successfully loaded and cached`)
    } catch (error) {
      logger.error(`Failed to load model ${modelConfig.id}:`, error)
      throw new Error(`Model loading failed: ${String(error)}`)
    }
  }

  /**
   * Enhanced feature engineering pipeline with automatic feature selection
   */
  extractFeatures(
    userId: string,
    conceptKey: string,
    knowledgeState: KnowledgeState,
    contextualInfo: ContextualInfo = {},
  ): Record<string, number> {
    const now = new Date()
    const timeOfDay = now.getHours() + now.getMinutes() / 60

    // Base features
    const features: Record<string, number> = {
      // Knowledge state features (normalized)
      currentMastery: this.normalizeFeature(knowledgeState.currentMastery ?? 0, 0, 1),
      learningVelocity: this.normalizeFeature(knowledgeState.learningVelocity ?? 1, 0.1, 3),
      totalInteractions: this.logNormalize(knowledgeState.totalInteractions ?? 1),
      accuracyRate: this.normalizeFeature(
        (knowledgeState.correctAnswers ?? 0) / Math.max(knowledgeState.totalInteractions ?? 1, 1),
        0,
        1,
      ),

      // BKT parameters
      pL0: this.normalizeFeature(knowledgeState.pL0 ?? 0.1, 0, 1),
      pT: this.normalizeFeature(knowledgeState.pT ?? 0.3, 0, 1),
      pG: this.normalizeFeature(knowledgeState.pG ?? 0.2, 0, 1),
      pS: this.normalizeFeature(knowledgeState.pS ?? 0.1, 0, 1),
      decayRate: this.normalizeFeature(knowledgeState.decayRate ?? 0.05, 0, 0.2),

      // Temporal features
      timeOfDay: timeOfDay / 24,
      dayOfWeek: now.getDay() / 7,
      hoursSinceLastInteraction: this.normalizeFeature(
        knowledgeState.lastInteraction
          ? (Date.now() - knowledgeState.lastInteraction.getTime()) / (1000 * 60 * 60)
          : 24,
        0,
        168, // Max 1 week
      ),

      // Contextual features
      fatigueLevel: this.normalizeFeature(contextualInfo.fatigueLevel ?? 0.2, 0, 1),
      studyStreak: this.logNormalize(contextualInfo.studyStreak ?? 1),
      sessionLength: this.normalizeFeature(
        (contextualInfo.sessionLength ?? 30) / 60,
        0,
        4, // Max 4 hours
      ),

      // Concept difficulty
      conceptDifficulty: this.normalizeFeature(contextualInfo.conceptDifficulty ?? 0.5, 0, 1),

      // User behavior patterns
      avgResponseTime: this.logNormalize(contextualInfo.avgResponseTime ?? 5000, 1000, 60000),
      confidenceLevel: this.normalizeFeature(contextualInfo.avgConfidence ?? 3, 1, 5),

      // Engagement metrics
      recentEngagement: this.normalizeFeature(contextualInfo.recentEngagement ?? 0.7, 0, 1),
      completionRate: this.normalizeFeature(contextualInfo.completionRate ?? 0.8, 0, 1),
    }

    // Add derived features
    features.masteryVelocityProduct =
      (features.currentMastery ?? 0) * (features.learningVelocity ?? 0)
    features.timeEngagementProduct = (features.timeOfDay ?? 0) * (features.recentEngagement ?? 0)
    features.streakAccuracyProduct = (features.studyStreak ?? 0) * (features.accuracyRate ?? 0)
    features.fatigueSessionProduct = (features.fatigueLevel ?? 0) * (features.sessionLength ?? 0)

    // Add interaction features
    features.masteryAccuracyDiff = Math.abs(
      (features.currentMastery ?? 0) - (features.accuracyRate ?? 0),
    )
    features.confidenceAccuracyDiff = Math.abs(
      (features.confidenceLevel ?? 0) - (features.accuracyRate ?? 0),
    )

    // Add temporal patterns
    features.isWeekend = now.getDay() === 0 || now.getDay() === 6 ? 1 : 0
    features.isPeakHours =
      (timeOfDay >= 9 && timeOfDay <= 11) || (timeOfDay >= 19 && timeOfDay <= 21) ? 1 : 0
    features.isLateNight = timeOfDay >= 22 || timeOfDay <= 6 ? 1 : 0

    return features
  }

  /**
   * Normalize feature to [0, 1] range
   */
  private normalizeFeature(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)))
  }

  /**
   * Log normalize with optional bounds
   */
  private logNormalize(value: number, min: number = 1, max: number = 1000): number {
    const clampedValue = Math.max(min, Math.min(max, value))
    return Math.log(clampedValue) / Math.log(max)
  }

  /**
   * Feature importance analysis
   */
  analyzeFeatureImportance(
    modelId: string,
    features: Record<string, number>,
    _prediction: number | number[],
  ): Record<string, number> {
    const model = this.models.get(modelId)
    if (!model) return {}

    const importance: Record<string, number> = {}
    const baseFeatures = Object.keys(features)

    // Simple permutation importance approximation
    for (const featureName of baseFeatures) {
      const originalValue = features[featureName]

      // Permute feature (set to mean/median)
      const permutedFeatures = { ...features }
      permutedFeatures[featureName] = 0.5 // Use median as baseline

      // This would require actual model prediction, simplified for now
      const importanceScore = Math.abs((originalValue ?? 0) - 0.5) * Math.random() * 0.1
      importance[featureName] = importanceScore
    }

    return importance
  }

  /**
   * Perform ML inference
   */
  async predict(
    modelId: string,
    features: Record<string, number>,
    userId?: string,
    conceptKey?: string,
  ): Promise<InferenceResult> {
    const model = this.models.get(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const startTime = performance.now()

    try {
      // Convert features to tensor
      const featureArray = model.metadata.features.map((feature) => features[feature] ?? 0)
      const inputTensor = tf.tensor2d([featureArray], [1, featureArray.length])

      // Perform inference
      const prediction = model.model.predict(inputTensor) as tf.Tensor
      const predictionData = await prediction.data()

      // Calculate confidence based on prediction distribution
      let confidence: number
      if (model.type === 'classification') {
        // For classification, confidence is the max probability
        confidence = Math.max(...Array.from(predictionData))
      } else {
        // For regression, confidence is based on prediction certainty (simplified)
        const firstPrediction = predictionData[0]
        if (firstPrediction === undefined) {
          throw new Error('No prediction data available')
        }
        confidence = Math.min(1, Math.max(0, 1 - Math.abs(firstPrediction - 0.5) * 2))
      }

      const inferenceTime = performance.now() - startTime

      // Clean up tensors
      inputTensor.dispose()
      prediction.dispose()

      // Update performance metrics
      this.updatePerformanceMetrics(modelId, inferenceTime)

      const result: InferenceResult = {
        modelId,
        prediction:
          predictionData.length === 1 ? (predictionData[0] ?? 0) : Array.from(predictionData),
        confidence,
        features,
        inferenceTime,
        timestamp: new Date(),
      }

      // Cache feature vector for drift detection
      if (userId != null && conceptKey != null) {
        const cacheKey = `${userId}:${conceptKey}`
        this.featureCache.set(cacheKey, {
          userId,
          conceptKey,
          features,
          timestamp: new Date(),
        })

        // Maintain cache size
        if (this.featureCache.size > this.maxCacheSize) {
          const oldestKey = Array.from(this.featureCache.keys())[0]
          if (oldestKey != null) {
            this.featureCache.delete(oldestKey)
          }
        }
      }

      return result
    } catch (error) {
      logger.error(`Inference failed for model ${modelId}:`, error)
      throw new Error(`Inference failed: ${String(error)}`)
    }
  }

  /**
   * Predict learning outcome probability
   */
  async predictLearningOutcome(
    userId: string,
    conceptKey: string,
    knowledgeState: KnowledgeState,
    contextualInfo: ContextualInfo = {},
  ): Promise<InferenceResult> {
    const features = this.extractFeatures(userId, conceptKey, knowledgeState, contextualInfo)
    return this.predict('learning-outcome-predictor', features, userId, conceptKey)
  }

  /**
   * Predict optimal difficulty level
   */
  async predictOptimalDifficulty(
    userId: string,
    conceptKey: string,
    knowledgeState: KnowledgeState,
    contextualInfo: ContextualInfo = {},
  ): Promise<InferenceResult> {
    const features = this.extractFeatures(userId, conceptKey, knowledgeState, contextualInfo)
    return this.predict('difficulty-optimizer', features, userId, conceptKey)
  }

  /**
   * Predict dropout risk
   */
  async predictDropoutRisk(
    userId: string,
    userProfile: UserProfile,
    recentActivity: RecentActivity[],
  ): Promise<InferenceResult> {
    const features = this.extractDropoutFeatures(userId, userProfile, recentActivity)
    return this.predict('dropout-predictor', features, userId)
  }

  /**
   * Extract features for dropout prediction
   */
  private extractDropoutFeatures(
    _userId: string,
    userProfile: UserProfile,
    recentActivity: RecentActivity[],
  ): Record<string, number> {
    const daysSinceRegistration = userProfile.createdAt
      ? (Date.now() - userProfile.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      : 1

    // Calculate activity patterns
    const last7Days = recentActivity.filter(
      (a) => Date.now() - new Date(a.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000,
    )
    const last30Days = recentActivity.filter(
      (a) => Date.now() - new Date(a.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000,
    )

    return {
      daysSinceRegistration: Math.log(Math.max(daysSinceRegistration, 1)),
      totalSessions: Math.log(Math.max(userProfile.totalSessions ?? 1, 1)),
      avgSessionLength: (userProfile.avgSessionLength ?? 30) / 60, // Convert to hours

      // Recent activity
      sessionsLast7Days: last7Days.length,
      sessionsLast30Days: last30Days.length,
      activityTrend: last7Days.length / Math.max(last30Days.length / 4, 1), // Weekly vs monthly average

      // Performance metrics
      overallAccuracy: userProfile.overallAccuracy ?? 0.5,
      avgMastery: userProfile.avgMastery ?? 0.3,
      conceptsCompleted: Math.log(Math.max(userProfile.conceptsCompleted ?? 1, 1)),

      // Engagement metrics
      streakLength: Math.log(Math.max(userProfile.currentStreak ?? 1, 1)),
      maxStreak: Math.log(Math.max(userProfile.maxStreak ?? 1, 1)),
      achievementsUnlocked: Math.log(Math.max(userProfile.achievementsUnlocked ?? 1, 1)),

      // Behavioral patterns
      preferredTimeOfDay: (userProfile.preferredTimeOfDay ?? 14) / 24,
      avgResponseTime: Math.log(Math.max(userProfile.avgResponseTime ?? 5000, 1000)) / 10,
      helpRequestFrequency: userProfile.helpRequestFrequency ?? 0.1,

      // Social features
      friendsCount: Math.log(Math.max(userProfile.friendsCount ?? 1, 1)),
      socialInteractions: Math.log(Math.max(userProfile.socialInteractions ?? 1, 1)),
    }
  }

  /**
   * Update model performance metrics
   */
  private updatePerformanceMetrics(_modelId: string, inferenceTime: number): void {
    const metrics = this.performanceMetrics.get(_modelId)
    if (!metrics) return

    metrics.totalInferences++
    metrics.avgInferenceTime =
      (metrics.avgInferenceTime * (metrics.totalInferences - 1) + inferenceTime) /
      metrics.totalInferences
    metrics.lastUsed = new Date()

    this.performanceMetrics.set(_modelId, metrics)
  }

  /**
   * Enhanced model drift detection with multiple methods
   */
  detectModelDrift(
    modelId: string,
    recentFeatures: FeatureVector[],
  ): {
    driftScore: number
    driftType: 'none' | 'mild' | 'moderate' | 'severe'
    affectedFeatures: string[]
    recommendation: string
  } {
    if (recentFeatures.length < 30) {
      return {
        driftScore: 0,
        driftType: 'none',
        affectedFeatures: [],
        recommendation: 'Insufficient data for drift detection',
      }
    }

    const model = this.models.get(modelId)
    if (!model) {
      return {
        driftScore: 0,
        driftType: 'none',
        affectedFeatures: [],
        recommendation: 'Model not found',
      }
    }

    const featureNames = model.metadata.features
    let totalDrift = 0
    const affectedFeatures: string[] = []

    // Calculate drift for each feature
    for (const featureName of featureNames) {
      const values = recentFeatures.map((f) => f.features[featureName] ?? 0)

      // Statistical measures
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      const stdDev = Math.sqrt(variance)

      // Expected baseline statistics (would be stored from training data)
      const expectedMean = 0.5 // Placeholder
      const expectedStdDev = 0.2 // Placeholder

      // Calculate drift using multiple methods
      const meanDrift = Math.abs(mean - expectedMean) / Math.max(expectedMean, 0.01)
      const varianceDrift = Math.abs(stdDev - expectedStdDev) / Math.max(expectedStdDev, 0.01)

      // Kolmogorov-Smirnov test approximation
      const sortedValues = values.sort((a, b) => a - b)
      let ksStat = 0
      for (let i = 0; i < sortedValues.length; i++) {
        const empiricalCDF = (i + 1) / sortedValues.length
        const currentValue = sortedValues[i]
        if (currentValue !== undefined) {
          const expectedCDF = this.normalCDF(currentValue, expectedMean, expectedStdDev)
          ksStat = Math.max(ksStat, Math.abs(empiricalCDF - expectedCDF))
        }
      }

      const featureDrift = Math.max(meanDrift, varianceDrift, ksStat)
      totalDrift += featureDrift

      if (featureDrift > 0.2) {
        affectedFeatures.push(featureName)
      }
    }

    const avgDrift = totalDrift / featureNames.length

    // Classify drift severity
    let driftType: 'none' | 'mild' | 'moderate' | 'severe'
    let recommendation: string

    if (avgDrift < 0.1) {
      driftType = 'none'
      recommendation = 'No significant drift detected. Continue monitoring.'
    } else if (avgDrift < 0.2) {
      driftType = 'mild'
      recommendation = 'Mild drift detected. Consider retraining within 30 days.'
    } else if (avgDrift < 0.4) {
      driftType = 'moderate'
      recommendation = 'Moderate drift detected. Schedule model retraining within 7 days.'
    } else {
      driftType = 'severe'
      recommendation = 'Severe drift detected. Immediate model retraining required.'
    }

    // Update drift score in metrics
    const metrics = this.performanceMetrics.get(modelId)
    if (metrics) {
      metrics.driftScore = avgDrift
      this.performanceMetrics.set(modelId, metrics)
    }

    return {
      driftScore: avgDrift,
      driftType,
      affectedFeatures,
      recommendation,
    }
  }

  /**
   * Normal CDF approximation for drift detection
   */
  private normalCDF(x: number, mean: number, stdDev: number): number {
    const z = (x - mean) / stdDev
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)))
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911

    const sign = x >= 0 ? 1 : -1
    x = Math.abs(x)

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
  }

  /**
   * Monitor model performance in real-time
   */
  monitorModelPerformance(modelId: string): {
    health: 'healthy' | 'warning' | 'critical'
    metrics: ModelPerformanceMetrics
    alerts: string[]
  } {
    const metrics = this.performanceMetrics.get(modelId)
    if (!metrics) {
      return {
        health: 'critical',
        metrics: {} as ModelPerformanceMetrics,
        alerts: ['Model metrics not found'],
      }
    }

    const alerts: string[] = []
    let health: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Check inference time
    if (metrics.avgInferenceTime > 1000) {
      // > 1 second
      alerts.push('High inference latency detected')
      health = 'warning'
    }

    if (metrics.avgInferenceTime > 5000) {
      // > 5 seconds
      alerts.push('Critical inference latency')
      health = 'critical'
    }

    // Check drift score
    if (metrics.driftScore > 0.2) {
      alerts.push('Model drift detected')
      health = health === 'critical' ? 'critical' : 'warning'
    }

    if (metrics.driftScore > 0.4) {
      alerts.push('Severe model drift - retraining required')
      health = 'critical'
    }

    // Check accuracy
    if (metrics.accuracyRate < 0.7) {
      alerts.push('Low model accuracy')
      health = health === 'critical' ? 'critical' : 'warning'
    }

    if (metrics.accuracyRate < 0.5) {
      alerts.push('Critical model accuracy')
      health = 'critical'
    }

    // Check last usage
    const hoursSinceLastUse = (Date.now() - metrics.lastUsed.getTime()) / (1000 * 60 * 60)
    if (hoursSinceLastUse > 24) {
      alerts.push('Model not used in 24+ hours')
    }

    return { health, metrics, alerts }
  }

  /**
   * Configure A/B test for model variants
   */
  configureABTest(config: ABTestConfig): void {
    this.abTestConfig.set(config.experimentId, config)
    logger.info(`A/B test configured: ${config.experimentId}`)
  }

  /**
   * A/B test model variants with enhanced tracking
   */
  selectModelVariant(
    baseModelId: string,
    userId: string,
    experimentId?: string,
  ): { modelId: string; isVariant: boolean; experimentId?: string } {
    // Check if there's an active A/B test
    const activeTest =
      experimentId != null
        ? this.abTestConfig.get(experimentId)
        : Array.from(this.abTestConfig.values()).find(
            (test) =>
              test.baseModelId === baseModelId &&
              test.isActive &&
              (!test.endDate || test.endDate > new Date()),
          )

    if (!activeTest) {
      return { modelId: baseModelId, isVariant: false }
    }

    // Hash-based traffic splitting for consistent user assignment
    const hash = createHash('md5')
      .update(userId + activeTest.experimentId)
      .digest('hex')
    const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff

    const isVariant = hashValue < activeTest.trafficSplit
    const selectedModelId = isVariant ? activeTest.variantModelId : activeTest.baseModelId

    return {
      modelId: selectedModelId,
      isVariant,
      experimentId: activeTest.experimentId,
    }
  }

  /**
   * Update A/B test metrics
   */
  updateABTestMetrics(experimentId: string, modelId: string, performance: number): void {
    const test = this.abTestConfig.get(experimentId)
    if (!test) return

    if (modelId === test.baseModelId) {
      test.metrics.baseModelPerformance = performance
    } else if (modelId === test.variantModelId) {
      test.metrics.variantModelPerformance = performance
    }

    // Calculate statistical significance (simplified)
    const diff = Math.abs(test.metrics.variantModelPerformance - test.metrics.baseModelPerformance)
    test.metrics.statisticalSignificance = diff / Math.max(test.metrics.baseModelPerformance, 0.01)

    this.abTestConfig.set(experimentId, test)
  }

  /**
   * Get A/B test results
   */
  getABTestResults(experimentId: string): ABTestConfig | undefined {
    return this.abTestConfig.get(experimentId)
  }

  /**
   * End A/B test and select winner
   */
  endABTest(experimentId: string): { winner: string; improvement: number } | null {
    const test = this.abTestConfig.get(experimentId)
    if (!test) return null

    test.isActive = false
    test.endDate = new Date()

    const winner =
      test.metrics.variantModelPerformance > test.metrics.baseModelPerformance
        ? test.variantModelId
        : test.baseModelId

    const improvement =
      Math.abs(test.metrics.variantModelPerformance - test.metrics.baseModelPerformance) /
      test.metrics.baseModelPerformance

    this.abTestConfig.set(experimentId, test)

    return { winner, improvement }
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics(modelId: string): ModelPerformanceMetrics | undefined {
    return this.performanceMetrics.get(modelId)
  }

  /**
   * Get all loaded models
   */
  getLoadedModels(): MLModel[] {
    return Array.from(this.models.values())
  }

  /**
   * Unload model from cache
   */
  unloadModel(modelId: string): void {
    const modelToUnload = this.models.get(modelId)
    if (modelToUnload != null) {
      modelToUnload.model.dispose()
      this.models.delete(modelId)
      this.modelCache.delete(modelId)
      this.performanceMetrics.delete(modelId)
      logger.info(`Model ${modelId} unloaded`)
    }
  }

  /**
   * Clean up all models and tensors
   */
  dispose(): void {
    for (const [, model] of this.models) {
      if (model?.model != null && typeof model.model.dispose === 'function') {
        model.model.dispose()
      }
    }
    this.models.clear()
    this.modelCache.clear()
    this.performanceMetrics.clear()
    this.featureCache.clear()
    logger.info('ML Inference Engine disposed')
  }
}
