import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as tf from '@tensorflow/tfjs-node'
import { MLInferenceEngine } from '../inference-engine'

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs-node', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  getBackend: vi.fn().mockReturnValue('cpu'),
  loadLayersModel: vi.fn(),
  loadGraphModel: vi.fn(),
  tensor2d: vi.fn(),
  sequential: vi.fn(),
  layers: {
    dense: vi.fn(),
    dropout: vi.fn(),
  },
}))

describe('MLInferenceEngine', () => {
  let engine: MLInferenceEngine
  let mockModel: any

  beforeEach(() => {
    engine = new MLInferenceEngine()

    // Create mock model
    mockModel = {
      predict: vi.fn().mockReturnValue({
        data: vi.fn().mockResolvedValue(new Float32Array([0.75])),
        dispose: vi.fn(),
      }),
      dispose: vi.fn(),
    }

    // Mock tensor operations
    const mockTensor = {
      data: vi.fn().mockResolvedValue(new Float32Array([0.75])),
      dispose: vi.fn(),
    }

    vi.mocked(tf.tensor2d).mockReturnValue(mockTensor as any)
    vi.mocked(tf.loadLayersModel).mockResolvedValue(mockModel)
  })

  afterEach(() => {
    engine.dispose()
    vi.clearAllMocks()
  })

  describe('loadModel', () => {
    it('should load and cache a model successfully', async () => {
      const modelConfig = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification' as const,
        inputShape: [10],
        outputShape: [1],
        metadata: {
          accuracy: 0.85,
          trainingDate: new Date(),
          features: ['feature1', 'feature2'],
          description: 'Test model',
        },
      }

      await engine.loadModel('test/model.json', modelConfig)

      expect(tf.loadLayersModel).toHaveBeenCalledWith('test/model.json')
      expect(engine.getLoadedModels()).toHaveLength(1)
      expect(engine.getLoadedModels()[0].id).toBe('test-model')
    })

    it('should handle model loading errors', async () => {
      vi.mocked(tf.loadLayersModel).mockRejectedValue(new Error('Load failed'))

      const modelConfig = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification' as const,
        inputShape: [10],
        outputShape: [1],
        metadata: {
          accuracy: 0.85,
          trainingDate: new Date(),
          features: ['feature1', 'feature2'],
          description: 'Test model',
        },
      }

      await expect(engine.loadModel('test/model.json', modelConfig)).rejects.toThrow(
        'Model loading failed',
      )
    })
  })

  describe('extractFeatures', () => {
    it('should extract features from knowledge state and context', () => {
      const knowledgeState = {
        currentMastery: 0.7,
        learningVelocity: 1.2,
        totalInteractions: 50,
        correctAnswers: 35,
        pL0: 0.1,
        pT: 0.3,
        pG: 0.2,
        pS: 0.1,
        decayRate: 0.05,
        lastInteraction: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      }

      const contextualInfo = {
        fatigueLevel: 0.3,
        studyStreak: 5,
        sessionLength: 45,
        avgResponseTime: 3000,
        avgConfidence: 4,
      }

      const features = engine.extractFeatures('user1', 'concept1', knowledgeState, contextualInfo)

      expect(features.currentMastery).toBe(0.7)
      expect(features.learningVelocity).toBeCloseTo(0.38, 1) // Normalized value
      expect(features.accuracyRate).toBe(0.7) // 35/50
      expect(features.fatigueLevel).toBe(0.3)
      expect(features.hoursSinceLastInteraction).toBeCloseTo(2, 1)
      expect(features.confidenceLevel).toBe(0.8) // 4/5
    })

    it('should handle missing knowledge state', () => {
      const features = engine.extractFeatures('user1', 'concept1', null, {})

      expect(features.currentMastery).toBe(0)
      expect(features.learningVelocity).toBeCloseTo(0.31, 1) // Normalized value
      expect(features.pL0).toBe(0.1)
      expect(features.hoursSinceLastInteraction).toBeCloseTo(0.14, 1) // Normalized value
    })
  })

  describe('predict', () => {
    beforeEach(async () => {
      const modelConfig = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification' as const,
        inputShape: [5],
        outputShape: [1],
        metadata: {
          accuracy: 0.85,
          trainingDate: new Date(),
          features: ['feature1', 'feature2', 'feature3', 'feature4', 'feature5'],
          description: 'Test model',
        },
      }

      await engine.loadModel('test/model.json', modelConfig)
    })

    it('should perform inference and return result', async () => {
      const features = {
        feature1: 0.5,
        feature2: 0.7,
        feature3: 0.3,
        feature4: 0.8,
        feature5: 0.6,
      }

      const result = await engine.predict('test-model', features, 'user1', 'concept1')

      expect(result.modelId).toBe('test-model')
      expect(result.prediction).toBe(0.75)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.features).toEqual(features)
      expect(result.inferenceTime).toBeGreaterThan(0)
    })

    it('should handle missing model', async () => {
      const features = { feature1: 0.5 }

      await expect(engine.predict('nonexistent-model', features)).rejects.toThrow(
        'Model nonexistent-model not found',
      )
    })

    it('should calculate confidence for classification models', async () => {
      // Mock multi-class output
      mockModel.predict.mockReturnValue({
        data: vi.fn().mockResolvedValue(new Float32Array([0.1, 0.8, 0.1])),
        dispose: vi.fn(),
      })

      const features = {
        feature1: 0.5,
        feature2: 0.7,
        feature3: 0.3,
        feature4: 0.8,
        feature5: 0.6,
      }

      const result = await engine.predict('test-model', features)

      expect(result.confidence).toBeCloseTo(0.8, 1) // Max probability
    })
  })

  describe('predictLearningOutcome', () => {
    beforeEach(async () => {
      const modelConfig = {
        id: 'learning-outcome-predictor',
        name: 'Learning Outcome Predictor',
        version: '1.0.0',
        type: 'classification' as const,
        inputShape: [15],
        outputShape: [1],
        metadata: {
          accuracy: 0.87,
          trainingDate: new Date(),
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
          description: 'Predicts learning outcome probability',
        },
      }

      await engine.loadModel('test/learning-outcome.json', modelConfig)
    })

    it('should predict learning outcome', async () => {
      const knowledgeState = {
        currentMastery: 0.6,
        learningVelocity: 1.1,
        totalInteractions: 30,
        correctAnswers: 20,
      }

      const result = await engine.predictLearningOutcome('user1', 'concept1', knowledgeState)

      expect(result.modelId).toBe('learning-outcome-predictor')
      expect(result.prediction).toBe(0.75)
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('detectModelDrift', () => {
    beforeEach(async () => {
      const modelConfig = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification' as const,
        inputShape: [3],
        outputShape: [1],
        metadata: {
          accuracy: 0.85,
          trainingDate: new Date(),
          features: ['feature1', 'feature2', 'feature3'],
          description: 'Test model',
        },
      }

      await engine.loadModel('test/model.json', modelConfig)
    })

    it('should detect model drift', async () => {
      const recentFeatures = Array.from({ length: 20 }, (_, i) => ({
        userId: `user${i}`,
        conceptKey: 'concept1',
        features: {
          feature1: Math.random(),
          feature2: Math.random(),
          feature3: Math.random(),
        },
        timestamp: new Date(),
      }))

      const driftScore = await engine.detectModelDrift('test-model', recentFeatures)

      expect(driftScore.driftScore).toBeGreaterThanOrEqual(0)
      expect(typeof driftScore.driftScore).toBe('number')
      expect(driftScore.driftType).toBeDefined()
      expect(driftScore.recommendation).toBeDefined()
    })

    it('should return 0 for insufficient samples', async () => {
      const recentFeatures = Array.from({ length: 5 }, (_, i) => ({
        userId: `user${i}`,
        conceptKey: 'concept1',
        features: { feature1: 0.5, feature2: 0.5, feature3: 0.5 },
        timestamp: new Date(),
      }))

      const driftScore = await engine.detectModelDrift('test-model', recentFeatures)

      expect(driftScore.driftScore).toBe(0)
    })
  })

  describe('selectModelVariant', () => {
    it('should select model variant based on hash', async () => {
      const baseModel = 'base-model'
      const variantModel = 'variant-model'
      const userId = 'user123'

      const selectedModel = await engine.selectModelVariant(baseModel, variantModel, userId, 0.5)

      expect([baseModel, variantModel]).toContain(selectedModel.modelId)
    })

    it('should be deterministic for same user', async () => {
      const baseModel = 'base-model'
      const variantModel = 'variant-model'
      const userId = 'user123'

      const selection1 = await engine.selectModelVariant(baseModel, variantModel, userId, 0.5)
      const selection2 = await engine.selectModelVariant(baseModel, variantModel, userId, 0.5)

      expect(selection1).toStrictEqual(selection2)
    })
  })

  describe('performance metrics', () => {
    beforeEach(async () => {
      const modelConfig = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification' as const,
        inputShape: [3],
        outputShape: [1],
        metadata: {
          accuracy: 0.85,
          trainingDate: new Date(),
          features: ['feature1', 'feature2', 'feature3'],
          description: 'Test model',
        },
      }

      await engine.loadModel('test/model.json', modelConfig)
    })

    it('should track performance metrics', async () => {
      const features = { feature1: 0.5, feature2: 0.7, feature3: 0.3 }

      await engine.predict('test-model', features)
      await engine.predict('test-model', features)

      const metrics = engine.getModelMetrics('test-model')

      expect(metrics).toBeDefined()
      expect(metrics!.totalInferences).toBe(2)
      expect(metrics!.avgInferenceTime).toBeGreaterThan(0)
      expect(metrics!.modelId).toBe('test-model')
    })
  })

  describe('cleanup', () => {
    it('should dispose models and clean up resources', async () => {
      const modelConfig = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification' as const,
        inputShape: [3],
        outputShape: [1],
        metadata: {
          accuracy: 0.85,
          trainingDate: new Date(),
          features: ['feature1', 'feature2', 'feature3'],
          description: 'Test model',
        },
      }

      await engine.loadModel('test/model.json', modelConfig)
      expect(engine.getLoadedModels()).toHaveLength(1)

      engine.unloadModel('test-model')
      expect(engine.getLoadedModels()).toHaveLength(0)
      expect(mockModel.dispose).toHaveBeenCalled()
    })

    it('should dispose all models on engine disposal', async () => {
      const modelConfig = {
        id: 'test-model',
        name: 'Test Model',
        version: '1.0.0',
        type: 'classification' as const,
        inputShape: [3],
        outputShape: [1],
        metadata: {
          accuracy: 0.85,
          trainingDate: new Date(),
          features: ['feature1', 'feature2', 'feature3'],
          description: 'Test model',
        },
      }

      await engine.loadModel('test/model.json', modelConfig)

      engine.dispose()

      expect(mockModel.dispose).toHaveBeenCalled()
      expect(engine.getLoadedModels()).toHaveLength(0)
    })
  })
})
