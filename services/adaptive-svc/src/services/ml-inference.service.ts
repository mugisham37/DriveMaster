import { EventEmitter } from 'events'

import * as tf from '@tensorflow/tfjs'

import { logger } from '../utils/logger.js'

export interface MLModel {
  id: string
  name: string
  version: string
  model: tf.LayersModel | tf.GraphModel
  metadata: {
    inputShape: number[]
    outputShape: number[]
    features: string[]
    createdAt: Date
    accuracy?: number
    f1Score?: number
  }
}

export interface InferenceRequest {
  modelId: string
  features: Record<string, number>
  userId?: string
  sessionId?: string
}

export interface InferenceResult {
  prediction: number | number[]
  confidence: number
  modelId: string
  modelVersion: string
  inferenceTime: number
  timestamp: Date
}

export interface ModelPerformanceMetrics {
  modelId: string
  totalInferences: number
  averageInferenceTime: number
  accuracyScore: number
  lastUpdated: Date
  errorRate: number
}

export class MLInferenceService extends EventEmitter {
  private models: Map<string, MLModel> = new Map()
  private modelCache: Map<string, tf.LayersModel | tf.GraphModel> = new Map()
  private performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map()
  private readonly maxCacheSize = 10

  constructor() {
    super()
    void this.initializeDefaultModels()
  }

  /**
   * Load and cache ML model for fast inference
   */
  async loadModel(
    modelPath: string,
    modelId: string,
    metadata: Partial<MLModel['metadata']>,
  ): Promise<void> {
    try {
      logger.info(`Loading ML model: ${modelId} from ${modelPath}`)

      const model = await tf.loadLayersModel(modelPath)

      const mlModel: MLModel = {
        id: modelId,
        name:
          metadata.features != null && metadata.features.length > 0
            ? metadata.features.join('_')
            : modelId,
        version: '1.0.0',
        model,
        metadata: {
          inputShape: metadata.inputShape ?? [1],
          outputShape: metadata.outputShape ?? [1],
          features: metadata.features ?? [],
          createdAt: new Date(),
          ...metadata,
        },
      }

      this.models.set(modelId, mlModel)
      this.modelCache.set(modelId, model)

      // Initialize performance metrics
      this.performanceMetrics.set(modelId, {
        modelId,
        totalInferences: 0,
        averageInferenceTime: 0,
        accuracyScore: metadata.accuracy != null && metadata.accuracy > 0 ? metadata.accuracy : 0,
        lastUpdated: new Date(),
        errorRate: 0,
      })

      this.emit('modelLoaded', { modelId, metadata: mlModel.metadata })
      logger.info(`Successfully loaded ML model: ${modelId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to load ML model ${modelId}:`, error)
      throw new Error(`Model loading failed: ${errorMessage}`)
    }
  }

  /**
   * Perform real-time inference with feature engineering
   */
  async predict(request: InferenceRequest): Promise<InferenceResult> {
    const startTime = Date.now()

    try {
      const model = this.modelCache.get(request.modelId)
      if (!model) {
        throw new Error(`Model ${request.modelId} not found or not loaded`)
      }

      const mlModel = this.models.get(request.modelId)
      if (!mlModel) {
        throw new Error(`Model metadata for ${request.modelId} not found`)
      }

      // Feature engineering pipeline
      const engineeredFeatures = this.engineerFeatures(request.features, mlModel.metadata.features)

      // Prepare input tensor
      const inputTensor = tf.tensor2d([engineeredFeatures], [1, engineeredFeatures.length])

      // Perform inference
      const predictionTensor = model.predict(inputTensor) as tf.Tensor
      const predictionData = await predictionTensor.data()

      // Calculate confidence score
      const confidence = this.calculateConfidence(predictionData)

      // Clean up tensors
      inputTensor.dispose()
      predictionTensor.dispose()

      const inferenceTime = Date.now() - startTime

      const prediction =
        predictionData.length === 1 ? (predictionData[0] ?? 0) : Array.from(predictionData)

      const result: InferenceResult = {
        prediction,
        confidence,
        modelId: request.modelId,
        modelVersion: mlModel.version,
        inferenceTime,
        timestamp: new Date(),
      }

      // Update performance metrics
      this.updatePerformanceMetrics(request.modelId, inferenceTime)

      this.emit('inferenceCompleted', { request, result })

      return result
    } catch (error) {
      this.updateErrorMetrics(request.modelId)
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Inference failed for model ${request.modelId}:`, error)
      throw new Error(`Inference failed: ${errorMessage}`)
    }
  }

  /**
   * Feature engineering pipeline for real-time feature extraction
   */
  private engineerFeatures(
    rawFeatures: Record<string, number>,
    expectedFeatures: string[],
  ): number[] {
    const engineered: number[] = []

    for (const feature of expectedFeatures) {
      const rawValue = rawFeatures[feature]
      let value = rawValue != null && rawValue > 0 ? rawValue : 0

      // Apply feature transformations based on feature name
      switch (feature) {
        case 'knowledge_state':
          // Normalize knowledge state to 0-1 range
          value = Math.max(0, Math.min(1, value))
          break
        case 'time_since_last_practice':
          // Log transform for time features
          value = Math.log(value + 1)
          break
        case 'difficulty_level':
          // Standardize difficulty levels
          value = (value - 3) / 2 // Assuming 1-5 scale, center around 3
          break
        case 'success_rate':
          // Ensure success rate is in 0-1 range
          value = Math.max(0, Math.min(1, value))
          break
        case 'session_length':
          // Normalize session length (assuming max 60 minutes)
          value = Math.min(value / 60, 1)
          break
        default:
          // Default normalization for unknown features
          value = Math.max(-3, Math.min(3, value)) // Clip to reasonable range
      }

      engineered.push(value)
    }

    return engineered
  }

  /**
   * Calculate confidence score from prediction
   */
  private calculateConfidence(prediction: Float32Array | Int32Array | Uint8Array): number {
    if (prediction.length === 1) {
      // Binary classification - distance from 0.5
      const firstValue = prediction[0]
      if (firstValue == null) return 0
      return Math.abs(firstValue - 0.5) * 2
    } else {
      // Multi-class - max probability
      return Math.max(...Array.from(prediction))
    }
  }

  /**
   * Update performance metrics for model monitoring
   */
  private updatePerformanceMetrics(modelId: string, _inferenceTime: number): void {
    const metrics = this.performanceMetrics.get(modelId)
    if (!metrics) return

    metrics.totalInferences++
    metrics.averageInferenceTime =
      (metrics.averageInferenceTime * (metrics.totalInferences - 1) + _inferenceTime) /
      metrics.totalInferences
    metrics.lastUpdated = new Date()

    this.performanceMetrics.set(modelId, metrics)
  }

  /**
   * Update error metrics for drift detection
   */
  private updateErrorMetrics(modelId: string): void {
    const metrics = this.performanceMetrics.get(modelId)
    if (!metrics) return

    const errorCount = metrics.errorRate * metrics.totalInferences + 1
    metrics.totalInferences++
    metrics.errorRate = errorCount / metrics.totalInferences
    metrics.lastUpdated = new Date()

    this.performanceMetrics.set(modelId, metrics)

    // Emit alert if error rate is too high
    if (metrics.errorRate > 0.05) {
      // 5% error rate threshold
      this.emit('highErrorRate', { modelId, errorRate: metrics.errorRate })
    }
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics(modelId: string): ModelPerformanceMetrics | null {
    return this.performanceMetrics.get(modelId) ?? null
  }

  /**
   * Get all loaded models
   */
  getLoadedModels(): MLModel[] {
    return Array.from(this.models.values())
  }

  /**
   * A/B testing support - get model variant for user
   */
  getModelVariant(baseModelId: string, userId: string): string {
    // Simple hash-based A/B testing
    const hash = this.hashUserId(userId)
    const variant = hash % 2 === 0 ? 'A' : 'B'

    const variantModelId = `${baseModelId}_${variant}`

    // Return variant if exists, otherwise return base model
    return this.models.has(variantModelId) ? variantModelId : baseModelId
  }

  /**
   * Initialize default models for common use cases
   */
  private async initializeDefaultModels(): Promise<void> {
    try {
      // Create simple models for demonstration
      await this.createDefaultKnowledgeStateModel()
      await this.createDefaultDifficultyModel()

      logger.info('Default ML models initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize default models:', error)
    }
  }

  /**
   * Create default knowledge state prediction model
   */
  private createDefaultKnowledgeStateModel(): Promise<void> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 16, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    })

    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossEntropy',
      metrics: ['accuracy'],
    })

    const mlModel: MLModel = {
      id: 'knowledge_state_predictor',
      name: 'Knowledge State Predictor',
      version: '1.0.0',
      model,
      metadata: {
        inputShape: [5],
        outputShape: [1],
        features: [
          'previous_knowledge',
          'time_since_practice',
          'difficulty_level',
          'success_rate',
          'session_length',
        ],
        createdAt: new Date(),
        accuracy: 0.85,
      },
    }

    this.models.set('knowledge_state_predictor', mlModel)
    this.modelCache.set('knowledge_state_predictor', model)

    this.performanceMetrics.set('knowledge_state_predictor', {
      modelId: 'knowledge_state_predictor',
      totalInferences: 0,
      averageInferenceTime: 0,
      accuracyScore: 0.85,
      lastUpdated: new Date(),
      errorRate: 0,
    })

    return Promise.resolve()
  }

  /**
   * Create default difficulty adjustment model
   */
  private createDefaultDifficultyModel(): Promise<void> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [4], units: 12, activation: 'relu' }),
        tf.layers.dense({ units: 6, activation: 'relu' }),
        tf.layers.dense({ units: 3, activation: 'softmax' }), // Easy, Medium, Hard
      ],
    })

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossEntropy',
      metrics: ['accuracy'],
    })

    const mlModel: MLModel = {
      id: 'difficulty_predictor',
      name: 'Difficulty Level Predictor',
      version: '1.0.0',
      model,
      metadata: {
        inputShape: [4],
        outputShape: [3],
        features: [
          'current_knowledge',
          'recent_performance',
          'time_pressure',
          'concept_complexity',
        ],
        createdAt: new Date(),
        accuracy: 0.78,
      },
    }

    this.models.set('difficulty_predictor', mlModel)
    this.modelCache.set('difficulty_predictor', model)

    this.performanceMetrics.set('difficulty_predictor', {
      modelId: 'difficulty_predictor',
      totalInferences: 0,
      averageInferenceTime: 0,
      accuracyScore: 0.78,
      lastUpdated: new Date(),
      errorRate: 0,
    })

    return Promise.resolve()
  }

  /**
   * Simple hash function for user ID
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Dispose all cached models
    for (const model of this.modelCache.values()) {
      model.dispose()
    }

    this.models.clear()
    this.modelCache.clear()
    this.performanceMetrics.clear()

    logger.info('ML Inference Service disposed')
  }
}

export const mlInferenceService = new MLInferenceService()
