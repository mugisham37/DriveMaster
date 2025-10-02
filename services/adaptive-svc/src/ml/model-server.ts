import { createHash } from 'crypto'
import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { join } from 'path'
import { performance } from 'perf_hooks'

import * as tf from '@tensorflow/tfjs'

export interface ModelMetadata {
  id: string
  name: string
  version: string
  type: 'classification' | 'regression' | 'embedding'
  inputShape: number[]
  outputShape: number[]
  features: string[]
  accuracy?: number
  f1Score?: number
  trainingDate: Date
  description: string
  checksum: string
}

export interface ModelServingConfig {
  modelId: string
  version: string
  warmupRequests: number
  maxConcurrentRequests: number
  timeoutMs: number
  enableCaching: boolean
  cacheTTL: number
  enableBatching: boolean
  batchSize: number
  batchTimeoutMs: number
}

export interface PredictionResult {
  prediction: number | number[]
  confidence: number
  latency: number
  cached: boolean
}

export interface BatchInferenceRequest {
  id: string
  features: Record<string, number>
  timestamp: number
  resolve: (result: PredictionResult) => void
  reject: (error: unknown) => void
}

export interface ModelPerformanceStats {
  modelId: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  avgLatency: number
  p95Latency: number
  p99Latency: number
  throughput: number
  lastUpdated: Date
  errorRate: number
}

export class ModelServer extends EventEmitter {
  private models: Map<string, tf.LayersModel | tf.GraphModel> = new Map()
  private modelMetadata: Map<string, ModelMetadata> = new Map()
  private modelConfigs: Map<string, ModelServingConfig> = new Map()
  private performanceStats: Map<string, ModelPerformanceStats> = new Map()
  private requestQueue: Map<string, BatchInferenceRequest[]> = new Map()
  private batchTimers: Map<string, NodeJS.Timeout> = new Map()
  private latencyHistory: Map<string, number[]> = new Map()
  private readonly maxLatencyHistory = 1000
  private readonly modelBasePath: string

  constructor(modelBasePath: string = './models') {
    super()
    this.modelBasePath = modelBasePath
  }

  /**
   * Load model with comprehensive validation and optimization
   */
  async loadModel(
    modelPath: string,
    metadata: Omit<ModelMetadata, 'checksum'>,
    config?: Partial<ModelServingConfig>,
  ): Promise<void> {
    try {
      // Validate model file exists
      const fullPath = join(this.modelBasePath, modelPath)
      await fs.access(fullPath)

      // Calculate model checksum for integrity verification
      const modelData = await fs.readFile(fullPath)
      const checksum = createHash('sha256').update(modelData).digest('hex')

      // Load TensorFlow.js model
      let model: tf.LayersModel | tf.GraphModel
      if (modelPath.includes('model.json')) {
        model = await tf.loadLayersModel(`file://${fullPath}`)
      } else {
        model = await tf.loadGraphModel(`file://${fullPath}`)
      }

      // Validate model structure
      this.validateModelStructure(model, metadata)

      // Store model and metadata
      const completeMetadata: ModelMetadata = { ...metadata, checksum }
      this.models.set(metadata.id, model)
      this.modelMetadata.set(metadata.id, completeMetadata)

      // Configure serving parameters
      const servingConfig: ModelServingConfig = {
        modelId: metadata.id,
        version: metadata.version,
        warmupRequests: 10,
        maxConcurrentRequests: 100,
        timeoutMs: 5000,
        enableCaching: true,
        cacheTTL: 300000, // 5 minutes
        enableBatching: true,
        batchSize: 32,
        batchTimeoutMs: 50,
        ...config,
      }
      this.modelConfigs.set(metadata.id, servingConfig)

      // Initialize performance stats
      this.performanceStats.set(metadata.id, {
        modelId: metadata.id,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        throughput: 0,
        lastUpdated: new Date(),
        errorRate: 0,
      })

      // Initialize request queue for batching
      this.requestQueue.set(metadata.id, [])
      this.latencyHistory.set(metadata.id, [])

      // Perform model warmup
      if (servingConfig.warmupRequests > 0) {
        await this.warmupModel(metadata.id, servingConfig.warmupRequests)
      }

      this.emit('modelLoaded', { modelId: metadata.id })
    } catch (error) {
      throw new Error(`Model loading failed: ${(error as Error).message}`)
    }
  }

  /**
   * Validate model structure matches metadata
   */
  private validateModelStructure(
    model: tf.LayersModel | tf.GraphModel,
    metadata: Omit<ModelMetadata, 'checksum'>,
  ): void {
    // Validate input shape
    const firstInput = model.inputs?.[0]
    if (!firstInput?.shape) {
      throw new Error('Model has no valid input shape')
    }

    const inputShape = firstInput.shape.slice(1) // Remove batch dimension
    if (JSON.stringify(inputShape) !== JSON.stringify(metadata.inputShape)) {
      throw new Error(
        `Input shape mismatch. Expected: ${JSON.stringify(metadata.inputShape)}, Got: ${JSON.stringify(inputShape)}`,
      )
    }

    // Validate output shape
    const firstOutput = model.outputs?.[0]
    if (!firstOutput?.shape) {
      throw new Error('Model has no valid output shape')
    }

    const outputShape = firstOutput.shape.slice(1) // Remove batch dimension
    if (JSON.stringify(outputShape) !== JSON.stringify(metadata.outputShape)) {
      throw new Error(
        `Output shape mismatch. Expected: ${JSON.stringify(metadata.outputShape)}, Got: ${JSON.stringify(outputShape)}`,
      )
    }
  }

  /**
   * Warm up model with dummy requests
   */
  private async warmupModel(modelId: string, warmupRequests: number): Promise<void> {
    const metadata = this.modelMetadata.get(modelId)
    if (!metadata) return

    const dummyFeatures: Record<string, number> = {}
    metadata.features.forEach((feature) => {
      dummyFeatures[feature] = Math.random()
    })

    const warmupPromises = Array.from(
      { length: warmupRequests },
      () => this.predict(modelId, dummyFeatures).catch(() => {}), // Ignore warmup errors
    )

    await Promise.all(warmupPromises)
  }

  /**
   * Perform model inference with batching and caching
   */
  async predict(
    modelId: string,
    features: Record<string, number>,
    options: { timeout?: number; priority?: 'high' | 'normal' | 'low' } = {},
  ): Promise<PredictionResult> {
    const config = this.modelConfigs.get(modelId)
    if (!config) {
      throw new Error(`Model ${modelId} not found`)
    }

    const startTime = performance.now()

    try {
      // Check if batching is enabled
      if (config.enableBatching) {
        return await this.batchedPredict(modelId, features, options)
      } else {
        return await this.directPredict(modelId, features)
      }
    } catch (error) {
      this.updatePerformanceStats(modelId, performance.now() - startTime, false)
      throw error
    }
  }

  /**
   * Direct prediction without batching
   */
  private async directPredict(
    modelId: string,
    features: Record<string, number>,
  ): Promise<PredictionResult> {
    const startTime = performance.now()
    const model = this.models.get(modelId)
    const metadata = this.modelMetadata.get(modelId)

    if (!model || !metadata) {
      throw new Error(`Model ${modelId} not loaded`)
    }

    // Convert features to tensor
    const featureArray = metadata.features.map((feature) => features[feature] ?? 0)
    const inputTensor = tf.tensor2d([featureArray], [1, featureArray.length])

    try {
      // Perform inference
      const prediction = model.predict(inputTensor) as tf.Tensor
      const predictionData = await prediction.data()

      // Calculate confidence
      let confidence: number
      if (metadata.type === 'classification') {
        confidence = Math.max(...Array.from(predictionData))
      } else {
        const firstPrediction = predictionData[0]
        if (firstPrediction === undefined) {
          throw new Error('No prediction data available')
        }
        confidence = Math.min(1, Math.max(0, 1 - Math.abs(firstPrediction - 0.5) * 2))
      }

      const latency = performance.now() - startTime

      // Clean up tensors
      inputTensor.dispose()
      prediction.dispose()

      // Update performance stats
      this.updatePerformanceStats(modelId, latency, true)

      return {
        prediction:
          predictionData.length === 1 ? (predictionData[0] ?? 0) : Array.from(predictionData),
        confidence,
        latency,
        cached: false,
      }
    } catch (error) {
      inputTensor.dispose()
      throw error
    }
  }

  /**
   * Batched prediction for improved throughput
   */
  private async batchedPredict(
    modelId: string,
    features: Record<string, number>,
    options: { timeout?: number; priority?: 'high' | 'normal' | 'low' },
  ): Promise<PredictionResult> {
    const config = this.modelConfigs.get(modelId)
    const queue = this.requestQueue.get(modelId)

    if (!config || !queue) {
      throw new Error(`Model ${modelId} not found or not properly configured`)
    }

    return new Promise((resolve, reject) => {
      const request: BatchInferenceRequest = {
        id: createHash('md5')
          .update(JSON.stringify(features) + Date.now())
          .digest('hex'),
        features,
        timestamp: Date.now(),
        resolve,
        reject,
      }

      // Add to queue based on priority
      if (options.priority === 'high') {
        queue.unshift(request)
      } else {
        queue.push(request)
      }

      // Set timeout
      const timeout = setTimeout(() => {
        const index = queue.findIndex((r) => r.id === request.id)
        if (index !== -1) {
          queue.splice(index, 1)
          reject(new Error('Request timeout'))
        }
      }, options.timeout ?? config.timeoutMs)

      // Process batch if queue is full or start timer
      if (queue.length >= config.batchSize) {
        void this.processBatch(modelId)
        clearTimeout(timeout)
      } else if (!this.batchTimers.has(modelId)) {
        const timer = setTimeout(() => {
          void this.processBatch(modelId)
          clearTimeout(timeout)
        }, config.batchTimeoutMs)
        this.batchTimers.set(modelId, timer)
      }
    })
  }

  /**
   * Process a batch of inference requests
   */
  private async processBatch(modelId: string): Promise<void> {
    const queue = this.requestQueue.get(modelId)
    const config = this.modelConfigs.get(modelId)
    const model = this.models.get(modelId)
    const metadata = this.modelMetadata.get(modelId)

    if (!queue || !config || !model || !metadata) {
      return
    }

    if (queue.length === 0) return

    // Clear batch timer
    const timer = this.batchTimers.get(modelId)
    if (timer) {
      clearTimeout(timer)
      this.batchTimers.delete(modelId)
    }

    // Extract batch
    const batch = queue.splice(0, config.batchSize)

    try {
      // Prepare batch tensor
      const batchFeatures = batch.map((req) =>
        metadata.features.map((feature) => req.features[feature] ?? 0),
      )
      const inputTensor = tf.tensor2d(batchFeatures)

      // Perform batch inference
      const predictions = model.predict(inputTensor) as tf.Tensor
      const predictionsData = await predictions.data()

      // Process results
      const outputSize = metadata.outputShape.reduce((a, b) => a * b, 1)
      for (let i = 0; i < batch.length; i++) {
        const request = batch[i]
        if (request == null) continue

        const startIdx = i * outputSize
        const endIdx = startIdx + outputSize
        const predictionSlice = Array.from(predictionsData.slice(startIdx, endIdx))

        // Calculate confidence
        let confidence: number
        if (metadata.type === 'classification') {
          confidence = Math.max(...predictionSlice)
        } else {
          const firstPrediction = predictionSlice[0]
          if (firstPrediction === undefined) {
            throw new Error('No prediction data available')
          }
          confidence = Math.min(1, Math.max(0, 1 - Math.abs(firstPrediction - 0.5) * 2))
        }

        const latency = performance.now() - request.timestamp

        request.resolve({
          prediction: predictionSlice.length === 1 ? (predictionSlice[0] ?? 0) : predictionSlice,
          confidence,
          latency,
          cached: false,
        })

        // Update performance stats
        this.updatePerformanceStats(modelId, latency, true)
      }

      // Clean up tensors
      inputTensor.dispose()
      predictions.dispose()
    } catch (error) {
      // Reject all requests in batch
      batch.forEach((request) => {
        if (request != null) {
          request.reject(error)
        }
      })

      // Update performance stats for failures
      batch.forEach((request) => {
        if (request != null) {
          this.updatePerformanceStats(modelId, performance.now() - request.timestamp, false)
        }
      })
    }
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(modelId: string, latency: number, success: boolean): void {
    const stats = this.performanceStats.get(modelId)
    if (!stats) return

    stats.totalRequests++
    if (success) {
      stats.successfulRequests++
    } else {
      stats.failedRequests++
    }

    // Update latency metrics
    const latencyHistory = this.latencyHistory.get(modelId)
    if (!latencyHistory) return

    latencyHistory.push(latency)

    // Keep only recent latency data
    if (latencyHistory.length > this.maxLatencyHistory) {
      latencyHistory.shift()
    }

    // Calculate percentiles
    const sortedLatencies = [...latencyHistory].sort((a, b) => a - b)
    stats.avgLatency =
      latencyHistory.length > 0
        ? latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length
        : 0
    stats.p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] ?? 0
    stats.p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] ?? 0

    // Calculate throughput (requests per second over last minute)
    const oneMinuteAgo = Date.now() - 60000
    const recentRequests = latencyHistory.filter((_, index) => {
      const timestamp =
        Date.now() - ((latencyHistory.length - index) * 1000) / latencyHistory.length
      return timestamp > oneMinuteAgo
    })
    stats.throughput = recentRequests.length

    // Calculate error rate
    stats.errorRate = stats.failedRequests / stats.totalRequests
    stats.lastUpdated = new Date()

    this.performanceStats.set(modelId, stats)

    // Emit performance update event
    this.emit('performanceUpdate', { modelId, stats })
  }

  /**
   * Get model performance statistics
   */
  getModelStats(modelId: string): ModelPerformanceStats | undefined {
    return this.performanceStats.get(modelId)
  }

  /**
   * Get all model statistics
   */
  getAllStats(): Record<string, ModelPerformanceStats> {
    const stats: Record<string, ModelPerformanceStats> = {}
    for (const [modelId, modelStats] of this.performanceStats) {
      stats[modelId] = modelStats
    }
    return stats
  }

  /**
   * Get model metadata
   */
  getModelMetadata(modelId: string): ModelMetadata | undefined {
    return this.modelMetadata.get(modelId)
  }

  /**
   * List all loaded models
   */
  listModels(): string[] {
    return Array.from(this.models.keys())
  }

  /**
   * Check model health
   */
  checkModelHealth(modelId: string): {
    status: 'healthy' | 'warning' | 'critical'
    issues: string[]
    recommendations: string[]
  } {
    const stats = this.performanceStats.get(modelId)
    if (!stats) {
      return {
        status: 'critical',
        issues: ['Model not found'],
        recommendations: ['Load the model'],
      }
    }

    const issues: string[] = []
    const recommendations: string[] = []
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'

    // Check error rate
    if (stats.errorRate > 0.1) {
      issues.push(`High error rate: ${(stats.errorRate * 100).toFixed(1)}%`)
      recommendations.push('Investigate model errors and retrain if necessary')
      status = 'warning'
    }

    if (stats.errorRate > 0.25) {
      status = 'critical'
    }

    // Check latency
    if (stats.p95Latency > 1000) {
      issues.push(`High P95 latency: ${stats.p95Latency.toFixed(0)}ms`)
      recommendations.push('Consider model optimization or scaling')
      status = status === 'critical' ? 'critical' : 'warning'
    }

    // Check throughput
    if (stats.throughput < 10) {
      issues.push(`Low throughput: ${stats.throughput} req/s`)
      recommendations.push('Check for bottlenecks or increase batch size')
      status = status === 'critical' ? 'critical' : 'warning'
    }

    return { status, issues, recommendations }
  }

  /**
   * Unload model and clean up resources
   */
  unloadModel(modelId: string): void {
    const model = this.models.get(modelId)
    if (model) {
      model.dispose()
      this.models.delete(modelId)
      this.modelMetadata.delete(modelId)
      this.modelConfigs.delete(modelId)
      this.performanceStats.delete(modelId)
      this.requestQueue.delete(modelId)
      this.latencyHistory.delete(modelId)

      const timer = this.batchTimers.get(modelId)
      if (timer) {
        clearTimeout(timer)
        this.batchTimers.delete(modelId)
      }

      this.emit('modelUnloaded', { modelId })
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Clear all batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer)
    }
    this.batchTimers.clear()

    // Process remaining batches
    for (const modelId of this.models.keys()) {
      await this.processBatch(modelId)
    }

    // Dispose all models
    for (const [, model] of this.models) {
      model.dispose()
    }

    this.models.clear()
    this.modelMetadata.clear()
    this.modelConfigs.clear()
    this.performanceStats.clear()
    this.requestQueue.clear()
    this.latencyHistory.clear()

    this.emit('shutdown')
  }
}
