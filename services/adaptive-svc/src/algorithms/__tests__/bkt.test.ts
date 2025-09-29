import { describe, it, expect, beforeEach } from 'vitest'
import {
  BayesianKnowledgeTracing,
  type EnhancedBKTParams,
  type BKTUpdateContext,
  type ConceptDependency,
  bktUpdate,
} from '../bkt.js'

describe('BayesianKnowledgeTracing', () => {
  let defaultParams: EnhancedBKTParams

  beforeEach(() => {
    defaultParams = {
      pL0: 0.1,
      pT: 0.3,
      pG: 0.2,
      pS: 0.1,
      decayRate: 0.05,
      learningVelocity: 1.0,
      confidenceWeight: 0.1,
      responseTimeWeight: 0.1,
    }
  })

  describe('Basic BKT Functionality', () => {
    it('should increase mastery probability with correct responses', () => {
      const context: BKTUpdateContext = { correct: true }
      const initialMastery = 0.3

      const result = BayesianKnowledgeTracing.updateKnowledgeState(
        defaultParams,
        context,
        initialMastery,
      )

      expect(result.newMastery).toBeGreaterThan(initialMastery)
      expect(result.newMastery).toBeLessThanOrEqual(0.999)
      expect(result.evidence).toBeGreaterThan(0)
    })

    it('should decrease mastery probability with incorrect responses', () => {
      const context: BKTUpdateContext = { correct: false }
      const initialMastery = 0.7

      const result = BayesianKnowledgeTracing.updateKnowledgeState(
        defaultParams,
        context,
        initialMastery,
      )

      expect(result.newMastery).toBeLessThan(initialMastery)
      expect(result.newMastery).toBeGreaterThanOrEqual(0.001)
    })

    it('should maintain mastery bounds between 0.001 and 0.999', () => {
      const contexts = [{ correct: true }, { correct: false }]

      for (const context of contexts) {
        // Test extreme values
        const extremeHighResult = BayesianKnowledgeTracing.updateKnowledgeState(
          defaultParams,
          context,
          0.999,
        )
        expect(extremeHighResult.newMastery).toBeLessThanOrEqual(0.999)
        expect(extremeHighResult.newMastery).toBeGreaterThanOrEqual(0.001)

        const extremeLowResult = BayesianKnowledgeTracing.updateKnowledgeState(
          defaultParams,
          context,
          0.001,
        )
        expect(extremeLowResult.newMastery).toBeLessThanOrEqual(0.999)
        expect(extremeLowResult.newMastery).toBeGreaterThanOrEqual(0.001)
      }
    })
  })

  describe('Temporal Decay', () => {
    it('should apply temporal decay correctly', () => {
      const initialMastery = 0.8
      const oneHourMs = 60 * 60 * 1000
      const decayRate = 0.05

      const decayedMastery = BayesianKnowledgeTracing.applyTemporalDecay(
        initialMastery,
        oneHourMs,
        decayRate,
      )

      expect(decayedMastery).toBeLessThan(initialMastery)
      expect(decayedMastery).toBeGreaterThan(0)

      // Test that longer time results in more decay
      const longerDecay = BayesianKnowledgeTracing.applyTemporalDecay(
        initialMastery,
        oneHourMs * 24, // 24 hours
        decayRate,
      )

      expect(longerDecay).toBeLessThan(decayedMastery)
    })

    it('should integrate temporal decay in knowledge state updates', () => {
      const context: BKTUpdateContext = {
        correct: true,
        timeSinceLastInteraction: 60 * 60 * 1000, // 1 hour
      }
      const initialMastery = 0.8

      const result = BayesianKnowledgeTracing.updateKnowledgeState(
        defaultParams,
        context,
        initialMastery,
      )

      // Should be less than if no time had passed
      const noDecayContext: BKTUpdateContext = { correct: true }
      const noDecayResult = BayesianKnowledgeTracing.updateKnowledgeState(
        defaultParams,
        noDecayContext,
        initialMastery,
      )

      expect(result.newMastery).toBeLessThan(noDecayResult.newMastery)
    })
  })

  describe('Response Time Factor', () => {
    it('should calculate response time factor correctly', () => {
      const expectedTime = 30000 // 30 seconds

      // Fast response should give higher factor
      const fastFactor = BayesianKnowledgeTracing.calculateResponseTimeFactor(15000, expectedTime)
      expect(fastFactor).toBeGreaterThan(0.5)

      // Slow response should give lower factor
      const slowFactor = BayesianKnowledgeTracing.calculateResponseTimeFactor(60000, expectedTime)
      expect(slowFactor).toBeLessThan(0.5)

      // Expected time should give factor around 0.5
      const expectedFactor = BayesianKnowledgeTracing.calculateResponseTimeFactor(
        expectedTime,
        expectedTime,
      )
      expect(expectedFactor).toBeCloseTo(0.5, 1)
    })

    it('should integrate response time in knowledge updates', () => {
      const fastContext: BKTUpdateContext = {
        correct: true,
        responseTime: 10000, // Fast response
      }

      const slowContext: BKTUpdateContext = {
        correct: true,
        responseTime: 60000, // Slow response
      }

      const paramsWithResponseWeight = {
        ...defaultParams,
        responseTimeWeight: 0.2,
      }

      const fastResult = BayesianKnowledgeTracing.updateKnowledgeState(
        paramsWithResponseWeight,
        fastContext,
        0.5,
      )

      const slowResult = BayesianKnowledgeTracing.updateKnowledgeState(
        paramsWithResponseWeight,
        slowContext,
        0.5,
      )

      expect(fastResult.newMastery).toBeGreaterThan(slowResult.newMastery)
    })
  })

  describe('Confidence Factor', () => {
    it('should calculate confidence factor correctly', () => {
      expect(BayesianKnowledgeTracing.calculateConfidenceFactor(1)).toBe(0.5)
      expect(BayesianKnowledgeTracing.calculateConfidenceFactor(3)).toBe(1.0)
      expect(BayesianKnowledgeTracing.calculateConfidenceFactor(5)).toBe(1.5)
      expect(BayesianKnowledgeTracing.calculateConfidenceFactor()).toBe(1.0)
    })

    it('should integrate confidence in knowledge updates', () => {
      const highConfidenceContext: BKTUpdateContext = {
        correct: true,
        confidence: 5,
      }

      const lowConfidenceContext: BKTUpdateContext = {
        correct: true,
        confidence: 1,
      }

      const paramsWithConfidenceWeight = {
        ...defaultParams,
        confidenceWeight: 0.2,
      }

      const highConfResult = BayesianKnowledgeTracing.updateKnowledgeState(
        paramsWithConfidenceWeight,
        highConfidenceContext,
        0.5,
      )

      const lowConfResult = BayesianKnowledgeTracing.updateKnowledgeState(
        paramsWithConfidenceWeight,
        lowConfidenceContext,
        0.5,
      )

      expect(highConfResult.newMastery).toBeGreaterThan(lowConfResult.newMastery)
    })
  })

  describe('Learning Velocity', () => {
    it('should adjust learning rate based on individual velocity', () => {
      const fastLearnerParams = {
        ...defaultParams,
        learningVelocity: 1.5,
      }

      const slowLearnerParams = {
        ...defaultParams,
        learningVelocity: 0.7,
      }

      const context: BKTUpdateContext = { correct: true }
      const initialMastery = 0.3

      const fastResult = BayesianKnowledgeTracing.updateKnowledgeState(
        fastLearnerParams,
        context,
        initialMastery,
      )

      const slowResult = BayesianKnowledgeTracing.updateKnowledgeState(
        slowLearnerParams,
        context,
        initialMastery,
      )

      expect(fastResult.newMastery).toBeGreaterThan(slowResult.newMastery)
    })
  })

  describe('Multiple Attempts Penalty', () => {
    it('should apply penalty for multiple attempts', () => {
      const singleAttemptContext: BKTUpdateContext = {
        correct: true,
        attempts: 1,
      }

      const multipleAttemptsContext: BKTUpdateContext = {
        correct: true,
        attempts: 3,
      }

      const initialMastery = 0.3

      const singleResult = BayesianKnowledgeTracing.updateKnowledgeState(
        defaultParams,
        singleAttemptContext,
        initialMastery,
      )

      const multipleResult = BayesianKnowledgeTracing.updateKnowledgeState(
        defaultParams,
        multipleAttemptsContext,
        initialMastery,
      )

      expect(singleResult.newMastery).toBeGreaterThan(multipleResult.newMastery)
    })
  })

  describe('Concept Dependencies', () => {
    it('should apply concept dependencies correctly', () => {
      const dependencies: ConceptDependency[] = [
        { prerequisite: 'basic-signs', weight: 0.8 },
        { prerequisite: 'road-rules', weight: 0.6 },
      ]

      const prerequisiteMasteries = new Map([
        ['basic-signs', 0.9],
        ['road-rules', 0.7],
      ])

      const currentMastery = 0.5
      const adjustedMastery = BayesianKnowledgeTracing.applyConceptDependencies(
        currentMastery,
        dependencies,
        prerequisiteMasteries,
      )

      expect(adjustedMastery).toBeGreaterThan(currentMastery)
      expect(adjustedMastery).toBeLessThanOrEqual(1.0)
    })

    it('should handle empty dependencies', () => {
      const currentMastery = 0.5
      const adjustedMastery = BayesianKnowledgeTracing.applyConceptDependencies(
        currentMastery,
        [],
        new Map(),
      )

      expect(adjustedMastery).toBe(currentMastery)
    })

    it('should handle missing prerequisite masteries', () => {
      const dependencies: ConceptDependency[] = [{ prerequisite: 'missing-concept', weight: 0.8 }]

      const currentMastery = 0.5
      const adjustedMastery = BayesianKnowledgeTracing.applyConceptDependencies(
        currentMastery,
        dependencies,
        new Map(),
      )

      // Should not increase mastery when prerequisites are not mastered
      expect(adjustedMastery).toBeLessThanOrEqual(currentMastery)
    })
  })

  describe('Parameter Estimation', () => {
    it('should estimate initial parameters for different concept types', () => {
      const basicParams = BayesianKnowledgeTracing.estimateInitialParams('basic-signs')
      const advancedParams = BayesianKnowledgeTracing.estimateInitialParams('advanced-maneuvers')

      expect(advancedParams.pL0).toBeLessThan(basicParams.pL0)
      expect(advancedParams.pT).toBeLessThan(basicParams.pT)
      expect(advancedParams.pG).toBeGreaterThan(basicParams.pG)
    })

    it('should adjust parameters based on user cognitive profile', () => {
      const fastLearnerProfile = {
        cognitiveProfile: {
          learningSpeed: 'fast',
          confidenceCorrelation: 'high',
          responseTimeCorrelation: 'high',
        },
      }

      const slowLearnerProfile = {
        cognitiveProfile: {
          learningSpeed: 'slow',
          confidenceCorrelation: 'low',
          responseTimeCorrelation: 'low',
        },
      }

      const fastParams = BayesianKnowledgeTracing.estimateInitialParams(
        'traffic-signs',
        fastLearnerProfile,
      )

      const slowParams = BayesianKnowledgeTracing.estimateInitialParams(
        'traffic-signs',
        slowLearnerProfile,
      )

      expect(fastParams.learningVelocity).toBeGreaterThan(slowParams.learningVelocity)
      expect(fastParams.pT).toBeGreaterThan(slowParams.pT)
      expect(fastParams.confidenceWeight).toBeGreaterThan(slowParams.confidenceWeight)
      expect(fastParams.responseTimeWeight).toBeGreaterThan(slowParams.responseTimeWeight)
    })
  })

  describe('Prediction Functions', () => {
    it('should predict correct response probability', () => {
      const mastery = 0.8
      const pG = 0.2
      const pS = 0.1

      const probability = BayesianKnowledgeTracing.predictCorrectProbability(mastery, pG, pS)

      // P(correct) = mastery * (1 - slip) + (1 - mastery) * guess
      const expected = mastery * (1 - pS) + (1 - mastery) * pG
      expect(probability).toBeCloseTo(expected, 5)
    })

    it('should calculate learning rate from mastery history', () => {
      const increasingHistory = [0.1, 0.2, 0.3, 0.4, 0.5]
      const decreasingHistory = [0.5, 0.4, 0.3, 0.2, 0.1]
      const stableHistory = [0.5, 0.5, 0.5, 0.5, 0.5]

      const increasingRate = BayesianKnowledgeTracing.calculateLearningRate(increasingHistory)
      const decreasingRate = BayesianKnowledgeTracing.calculateLearningRate(decreasingHistory)
      const stableRate = BayesianKnowledgeTracing.calculateLearningRate(stableHistory)

      expect(increasingRate).toBeGreaterThan(0)
      expect(decreasingRate).toBeLessThan(0)
      expect(stableRate).toBeCloseTo(0, 2)
    })

    it('should handle insufficient history for learning rate calculation', () => {
      expect(BayesianKnowledgeTracing.calculateLearningRate([])).toBe(0)
      expect(BayesianKnowledgeTracing.calculateLearningRate([0.5])).toBe(0)
    })
  })

  describe('Legacy Compatibility', () => {
    it('should maintain backward compatibility with bktUpdate function', () => {
      const params = {
        pL0: 0.1,
        pT: 0.3,
        pG: 0.2,
        pS: 0.1,
      }

      const result = bktUpdate(params, true, 0.5)

      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(1)
    })
  })

  describe('Property-Based Testing', () => {
    it('should converge to high mastery with consistent correct responses', () => {
      let mastery = 0.1
      const context: BKTUpdateContext = { correct: true }

      // Simulate 20 correct responses
      for (let i = 0; i < 20; i++) {
        const result = BayesianKnowledgeTracing.updateKnowledgeState(
          defaultParams,
          context,
          mastery,
        )
        mastery = result.newMastery
      }

      expect(mastery).toBeGreaterThan(0.8)
    })

    it('should converge to low mastery with consistent incorrect responses', () => {
      let mastery = 0.9
      const context: BKTUpdateContext = { correct: false }

      // Simulate 20 incorrect responses
      for (let i = 0; i < 20; i++) {
        const result = BayesianKnowledgeTracing.updateKnowledgeState(
          defaultParams,
          context,
          mastery,
        )
        mastery = result.newMastery
      }

      // With guess parameter of 0.2, mastery won't go below a certain threshold
      // The algorithm should still show significant decrease from initial 0.9
      expect(mastery).toBeLessThan(0.5)
      expect(mastery).toBeLessThan(0.9) // Should definitely be less than initial
    })

    it('should be monotonic for consistent response patterns', () => {
      const correctMasteries: number[] = []
      const incorrectMasteries: number[] = []

      let correctMastery = 0.3
      let incorrectMastery = 0.7

      for (let i = 0; i < 10; i++) {
        const correctResult = BayesianKnowledgeTracing.updateKnowledgeState(
          defaultParams,
          { correct: true },
          correctMastery,
        )
        correctMastery = correctResult.newMastery
        correctMasteries.push(correctMastery)

        const incorrectResult = BayesianKnowledgeTracing.updateKnowledgeState(
          defaultParams,
          { correct: false },
          incorrectMastery,
        )
        incorrectMastery = incorrectResult.newMastery
        incorrectMasteries.push(incorrectMastery)
      }

      // Check monotonicity for correct responses (should generally increase)
      for (let i = 1; i < correctMasteries.length; i++) {
        expect(correctMasteries[i]).toBeGreaterThanOrEqual(correctMasteries[i - 1])
      }

      // Check monotonicity for incorrect responses (should generally decrease)
      for (let i = 1; i < incorrectMasteries.length; i++) {
        expect(incorrectMasteries[i]).toBeLessThanOrEqual(incorrectMasteries[i - 1])
      }
    })

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        { mastery: 0.001, correct: true },
        { mastery: 0.001, correct: false },
        { mastery: 0.999, correct: true },
        { mastery: 0.999, correct: false },
      ]

      for (const { mastery, correct } of edgeCases) {
        const result = BayesianKnowledgeTracing.updateKnowledgeState(
          defaultParams,
          { correct },
          mastery,
        )

        expect(result.newMastery).toBeGreaterThanOrEqual(0.001)
        expect(result.newMastery).toBeLessThanOrEqual(0.999)
        expect(result.evidence).toBeGreaterThanOrEqual(0)
      }
    })

    it('should be stable under parameter variations', () => {
      const parameterVariations = [
        { ...defaultParams, pT: 0.1 },
        { ...defaultParams, pT: 0.5 },
        { ...defaultParams, pG: 0.1 },
        { ...defaultParams, pG: 0.3 },
        { ...defaultParams, pS: 0.05 },
        { ...defaultParams, pS: 0.2 },
      ]

      const context: BKTUpdateContext = { correct: true }
      const initialMastery = 0.5

      for (const params of parameterVariations) {
        const result = BayesianKnowledgeTracing.updateKnowledgeState(
          params,
          context,
          initialMastery,
        )

        expect(result.newMastery).toBeGreaterThanOrEqual(0.001)
        expect(result.newMastery).toBeLessThanOrEqual(0.999)
        expect(result.newMastery).toBeGreaterThan(initialMastery) // Should increase with correct response
      }
    })
  })
})
