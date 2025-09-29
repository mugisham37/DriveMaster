import { describe, it, expect } from 'vitest'
import {
  calculateBayesianConfidenceInterval,
  calculateEvidenceBasedConfidence,
  calculateWilsonConfidenceInterval,
  calculateAdaptiveConfidenceInterval,
  calculateCredibleInterval,
  isMasterySignificant,
  type BayesianConfidenceParams,
} from '../confidence-intervals.js'

describe('Confidence Intervals', () => {
  describe('Bayesian Confidence Interval', () => {
    it('should calculate confidence interval for Beta distribution', () => {
      const params: BayesianConfidenceParams = {
        alpha: 8, // 7 successes + 1
        beta: 4, // 3 failures + 1
        confidence: 0.95,
      }

      const interval = calculateBayesianConfidenceInterval(params)

      expect(interval.lower).toBeGreaterThanOrEqual(0)
      expect(interval.upper).toBeLessThanOrEqual(1)
      expect(interval.lower).toBeLessThan(interval.upper)
      expect(interval.confidence).toBe(0.95)

      // With more successes than failures, mean should be > 0.5
      const mean = params.alpha / (params.alpha + params.beta)
      expect(mean).toBeGreaterThan(0.5)
    })

    it('should handle extreme cases', () => {
      // All successes
      const allSuccesses = calculateBayesianConfidenceInterval({
        alpha: 10,
        beta: 1,
        confidence: 0.95,
      })
      expect(allSuccesses.lower).toBeGreaterThan(0.5)
      expect(allSuccesses.upper).toBeLessThanOrEqual(1)

      // All failures
      const allFailures = calculateBayesianConfidenceInterval({
        alpha: 1,
        beta: 10,
        confidence: 0.95,
      })
      expect(allFailures.lower).toBeGreaterThanOrEqual(0)
      expect(allFailures.upper).toBeLessThan(0.5)
    })
  })

  describe('Evidence-Based Confidence', () => {
    it('should calculate confidence based on evidence history', () => {
      const evidenceHistory = [0.1, 0.15, 0.12, 0.18, 0.14]
      const currentMastery = 0.7

      const interval = calculateEvidenceBasedConfidence(evidenceHistory, currentMastery)

      expect(interval.lower).toBeGreaterThanOrEqual(0)
      expect(interval.upper).toBeLessThanOrEqual(1)
      expect(interval.lower).toBeLessThan(interval.upper)
      expect(interval.confidence).toBe(0.95)
    })

    it('should handle empty evidence history', () => {
      const interval = calculateEvidenceBasedConfidence([], 0.5)

      expect(interval.lower).toBe(0)
      expect(interval.upper).toBe(1)
      expect(interval.confidence).toBe(0.95)
    })

    it('should handle single evidence point', () => {
      const interval = calculateEvidenceBasedConfidence([0.2], 0.6)

      expect(interval.lower).toBeGreaterThanOrEqual(0)
      expect(interval.upper).toBeLessThanOrEqual(1)
      expect(interval.upper - interval.lower).toBeCloseTo(0.6, 1) // Should be wide interval
    })

    it('should narrow interval with more evidence', () => {
      const shortHistory = [0.1, 0.12]
      const longHistory = [0.1, 0.12, 0.11, 0.13, 0.09, 0.14, 0.1, 0.12, 0.11, 0.13]

      const shortInterval = calculateEvidenceBasedConfidence(shortHistory, 0.7)
      const longInterval = calculateEvidenceBasedConfidence(longHistory, 0.7)

      // Longer history should give narrower interval
      expect(longInterval.upper - longInterval.lower).toBeLessThan(
        shortInterval.upper - shortInterval.lower,
      )
    })
  })

  describe('Wilson Confidence Interval', () => {
    it('should calculate Wilson score interval', () => {
      const successes = 7
      const trials = 10

      const interval = calculateWilsonConfidenceInterval(successes, trials)

      expect(interval.lower).toBeGreaterThanOrEqual(0)
      expect(interval.upper).toBeLessThanOrEqual(1)
      expect(interval.lower).toBeLessThan(interval.upper)
      expect(interval.confidence).toBe(0.95)

      // Should be centered around the proportion
      const proportion = successes / trials
      const center = (interval.lower + interval.upper) / 2
      expect(Math.abs(center - proportion)).toBeLessThan(0.1)
    })

    it('should handle edge cases', () => {
      // No trials
      const noTrials = calculateWilsonConfidenceInterval(0, 0)
      expect(noTrials.lower).toBe(0)
      expect(noTrials.upper).toBe(1)

      // Perfect success
      const perfectSuccess = calculateWilsonConfidenceInterval(10, 10)
      expect(perfectSuccess.lower).toBeGreaterThan(0.7)
      expect(perfectSuccess.upper).toBe(1)

      // Perfect failure
      const perfectFailure = calculateWilsonConfidenceInterval(0, 10)
      expect(perfectFailure.lower).toBe(0)
      expect(perfectFailure.upper).toBeLessThan(0.3)
    })

    it('should narrow with larger sample size', () => {
      const smallSample = calculateWilsonConfidenceInterval(5, 10)
      const largeSample = calculateWilsonConfidenceInterval(50, 100)

      // Larger sample should give narrower interval
      expect(largeSample.upper - largeSample.lower).toBeLessThan(
        smallSample.upper - smallSample.lower,
      )
    })
  })

  describe('Adaptive Confidence Interval', () => {
    it('should combine multiple methods', () => {
      const evidenceHistory = [0.1, 0.12, 0.15, 0.11, 0.13]
      const successes = 8
      const trials = 10
      const currentMastery = 0.75

      const interval = calculateAdaptiveConfidenceInterval(
        currentMastery,
        evidenceHistory,
        successes,
        trials,
      )

      expect(interval.lower).toBeGreaterThanOrEqual(0)
      expect(interval.upper).toBeLessThanOrEqual(1)
      expect(interval.lower).toBeLessThan(interval.upper)
      expect(interval.confidence).toBe(0.95)
    })

    it('should handle missing data gracefully', () => {
      // Only evidence history
      const evidenceOnly = calculateAdaptiveConfidenceInterval(0.6, [0.1, 0.12], 0, 0)
      expect(evidenceOnly.lower).toBeGreaterThanOrEqual(0)
      expect(evidenceOnly.upper).toBeLessThanOrEqual(1)

      // Only trial data
      const trialsOnly = calculateAdaptiveConfidenceInterval(0.6, [], 6, 10)
      expect(trialsOnly.lower).toBeGreaterThanOrEqual(0)
      expect(trialsOnly.upper).toBeLessThanOrEqual(1)

      // No data
      const noData = calculateAdaptiveConfidenceInterval(0.6, [], 0, 0)
      expect(noData.lower).toBe(0)
      expect(noData.upper).toBe(1)
    })
  })

  describe('Credible Interval', () => {
    it('should calculate Bayesian credible interval', () => {
      const priorAlpha = 1
      const priorBeta = 1
      const successes = 7
      const failures = 3

      const interval = calculateCredibleInterval(priorAlpha, priorBeta, successes, failures)

      expect(interval.lower).toBeGreaterThanOrEqual(0)
      expect(interval.upper).toBeLessThanOrEqual(1)
      expect(interval.lower).toBeLessThan(interval.upper)
      expect(interval.confidence).toBe(0.95)
    })

    it('should incorporate prior beliefs', () => {
      const successes = 5
      const failures = 5

      // Optimistic prior
      const optimisticInterval = calculateCredibleInterval(5, 1, successes, failures)

      // Pessimistic prior
      const pessimisticInterval = calculateCredibleInterval(1, 5, successes, failures)

      // Optimistic prior should shift interval higher
      expect(optimisticInterval.lower).toBeGreaterThan(pessimisticInterval.lower)
      expect(optimisticInterval.upper).toBeGreaterThan(pessimisticInterval.upper)
    })
  })

  describe('Mastery Significance Testing', () => {
    it('should determine if mastery is significantly above threshold', () => {
      const interval = { lower: 0.85, upper: 0.95, confidence: 0.95 }
      const threshold = 0.8

      const result = isMasterySignificant(0.9, threshold, interval)

      expect(result.isSignificant).toBe(true)
      expect(result.direction).toBe('above')
      expect(result.confidence).toBe(0.95)
    })

    it('should determine if mastery is significantly below threshold', () => {
      const interval = { lower: 0.2, upper: 0.4, confidence: 0.95 }
      const threshold = 0.5

      const result = isMasterySignificant(0.3, threshold, interval)

      expect(result.isSignificant).toBe(true)
      expect(result.direction).toBe('below')
      expect(result.confidence).toBe(0.95)
    })

    it('should identify uncertain cases', () => {
      const interval = { lower: 0.4, upper: 0.9, confidence: 0.95 }
      const threshold = 0.7

      const result = isMasterySignificant(0.65, threshold, interval)

      expect(result.isSignificant).toBe(false)
      expect(result.direction).toBe('uncertain')
      expect(result.confidence).toBe(0.95)
    })
  })

  describe('Confidence Level Variations', () => {
    it('should handle different confidence levels', () => {
      const params: BayesianConfidenceParams = {
        alpha: 8,
        beta: 4,
        confidence: 0.9,
      }

      const interval90 = calculateBayesianConfidenceInterval(params)
      const interval95 = calculateBayesianConfidenceInterval({ ...params, confidence: 0.95 })
      const interval99 = calculateBayesianConfidenceInterval({ ...params, confidence: 0.99 })

      // Higher confidence should give wider intervals
      expect(interval99.upper - interval99.lower).toBeGreaterThan(
        interval95.upper - interval95.lower,
      )
      expect(interval95.upper - interval95.lower).toBeGreaterThan(
        interval90.upper - interval90.lower,
      )
    })
  })

  describe('Property-Based Testing', () => {
    it('should always produce valid intervals', () => {
      const testCases = [
        { alpha: 1, beta: 1, confidence: 0.95 },
        { alpha: 10, beta: 2, confidence: 0.9 },
        { alpha: 3, beta: 15, confidence: 0.99 },
        { alpha: 50, beta: 50, confidence: 0.95 },
      ]

      for (const params of testCases) {
        const interval = calculateBayesianConfidenceInterval(params)

        expect(interval.lower).toBeGreaterThanOrEqual(0)
        expect(interval.upper).toBeLessThanOrEqual(1)
        expect(interval.lower).toBeLessThanOrEqual(interval.upper)
        expect(interval.confidence).toBe(params.confidence)
      }
    })

    it('should be consistent across methods for similar inputs', () => {
      const successes = 8
      const trials = 10
      const evidenceHistory = Array(10).fill(0.1) // Consistent evidence

      const wilsonInterval = calculateWilsonConfidenceInterval(successes, trials)
      const bayesianInterval = calculateBayesianConfidenceInterval({
        alpha: successes + 1,
        beta: trials - successes + 1,
        confidence: 0.95,
      })

      // Intervals should be reasonably close for similar data
      const wilsonWidth = wilsonInterval.upper - wilsonInterval.lower
      const bayesianWidth = bayesianInterval.upper - bayesianInterval.lower

      expect(Math.abs(wilsonWidth - bayesianWidth)).toBeLessThan(0.3)
    })
  })
})
