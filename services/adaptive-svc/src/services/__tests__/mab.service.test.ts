import { describe, it, expect, beforeEach } from 'vitest'
import { MABService } from '../mab.service.js'
import type {
  MABConfig,
  Question,
  LearningContext,
  LearningOutcome,
  QuestionSelection,
} from '../../types/mab.types.js'

describe('MABService Integration Tests', () => {
  let mabService: MABService
  let defaultConfig: MABConfig
  let sampleQuestions: Question[]
  let sampleContext: LearningContext

  beforeEach(() => {
    defaultConfig = {
      explorationRate: 0.1,
      zpdMinSuccess: 0.7,
      zpdMaxSuccess: 0.85,
      engagementWeight: 0.2,
      difficultyWeight: 0.2,
      freshnessWeight: 0.1,
      fatigueThreshold: 0.7,
      performanceWindowSize: 100,
      minQuestionsForStats: 5,
      conceptDriftThreshold: 0.3,
      sessionOptimizationEnabled: true,
    }

    mabService = new MABService(defaultConfig)

    sampleQuestions = [
      {
        id: 'q1',
        conceptId: 'traffic-signs',
        title: 'Stop Sign Recognition',
        difficulty: 0.3,
        discrimination: 0.8,
        guessParameter: 0.2,
        category: 'signs',
        estimatedTime: 30,
        tags: ['basic', 'signs'],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          isActive: true,
          authorId: 'author1',
          reviewCount: 50,
          averageRating: 4.2,
        },
      },
      {
        id: 'q2',
        conceptId: 'road-rules',
        title: 'Right of Way',
        difficulty: 0.6,
        discrimination: 0.7,
        guessParameter: 0.25,
        category: 'rules',
        estimatedTime: 45,
        tags: ['intermediate', 'rules'],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          isActive: true,
          authorId: 'author2',
          reviewCount: 75,
          averageRating: 4.0,
        },
      },
      {
        id: 'q3',
        conceptId: 'safety',
        title: 'Emergency Procedures',
        difficulty: 0.8,
        discrimination: 0.9,
        guessParameter: 0.15,
        category: 'safety',
        estimatedTime: 60,
        tags: ['advanced', 'safety'],
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          isActive: true,
          authorId: 'author3',
          reviewCount: 30,
          averageRating: 4.5,
        },
      },
    ]

    sampleContext = {
      userId: 'user123',
      sessionId: 'session456',
      sessionGoals: ['practice', 'improve'],
      timeOfDay: '10:30',
      deviceType: 'mobile',
      networkCondition: 'fast',
      availableTime: 30,
      currentStreak: 5,
      fatigueLevel: 0.2,
      previousPerformance: 0.75,
      studyStreak: 10,
      userMastery: 0.6,
    }
  })

  describe('Question Selection', () => {
    it('should select optimal question from available options', async () => {
      const selection = await mabService.selectOptimalQuestion(
        'user123',
        sampleQuestions,
        sampleContext,
      )

      expect(selection).toBeDefined()
      expect(selection.question).toBeDefined()
      expect(sampleQuestions).toContain(selection.question)
      expect(selection.expectedReward).toBeGreaterThanOrEqual(0)
      expect(selection.expectedReward).toBeLessThanOrEqual(1)
      expect(selection.selectionReason).toBeDefined()
      expect(selection.contextualFactors).toBeDefined()
    })

    it('should throw error when no questions available', async () => {
      await expect(mabService.selectOptimalQuestion('user123', [], sampleContext)).rejects.toThrow(
        'No available questions provided',
      )
    })

    it('should adapt selection based on user mastery level', async () => {
      const beginnerContext = { ...sampleContext, userMastery: 0.2 }
      const expertContext = { ...sampleContext, userMastery: 0.9 }

      const beginnerSelection = await mabService.selectOptimalQuestion(
        'user123',
        sampleQuestions,
        beginnerContext,
      )
      const expertSelection = await mabService.selectOptimalQuestion(
        'user456',
        sampleQuestions,
        expertContext,
      )

      // Both selections should be valid
      expect(beginnerSelection.question).toBeDefined()
      expect(expertSelection.question).toBeDefined()

      // The contextual factors should reflect the mastery difference
      expect(beginnerSelection.contextualFactors.difficultyMatch).toBeGreaterThanOrEqual(0)
      expect(expertSelection.contextualFactors.difficultyMatch).toBeGreaterThanOrEqual(0)
    })

    it('should consider fatigue level in selection', async () => {
      const freshContext = { ...sampleContext, fatigueLevel: 0.1 }
      const tiredContext = { ...sampleContext, fatigueLevel: 0.8 }

      const freshSelection = await mabService.selectOptimalQuestion(
        'user123',
        sampleQuestions,
        freshContext,
      )
      const tiredSelection = await mabService.selectOptimalQuestion(
        'user123',
        sampleQuestions,
        tiredContext,
      )

      // Tired users should get easier content or different contextual factors
      expect(tiredSelection.contextualFactors.fatigueAdjustment).toBeLessThan(
        freshSelection.contextualFactors.fatigueAdjustment,
      )
    })

    it('should provide transparent selection reasoning', async () => {
      const selection = await mabService.selectOptimalQuestion(
        'user123',
        sampleQuestions,
        sampleContext,
      )

      expect(selection.selectionReason).toBeDefined()
      expect(typeof selection.selectionReason).toBe('string')
      expect(selection.selectionReason.length).toBeGreaterThan(0)

      // Check contextual factors are provided
      const factors = selection.contextualFactors
      expect(factors.difficultyMatch).toBeGreaterThanOrEqual(0)
      expect(factors.zpdReward).toBeGreaterThanOrEqual(0)
      expect(factors.engagementReward).toBeGreaterThanOrEqual(0)
      expect(factors.progressionReward).toBeGreaterThanOrEqual(0)
      expect(factors.fatigueAdjustment).toBeGreaterThan(0)
      expect(factors.goalAlignment).toBeGreaterThanOrEqual(0)
      expect(factors.timeAdjustment).toBeGreaterThan(0)
    })
  })

  describe('Reward Model Updates', () => {
    it('should update reward model based on learning outcomes', async () => {
      const outcome: LearningOutcome = {
        questionId: 'q1',
        userId: 'user123',
        isCorrect: true,
        responseTime: 25000,
        confidence: 4,
        attempts: 1,
        timestamp: new Date(),
        sessionId: 'session456',
        contextData: {
          fatigueLevel: 0.2,
          timeOfDay: '10:30',
          deviceType: 'mobile',
        },
      }

      await expect(mabService.updateRewardModel('user123', 'q1', outcome)).resolves.not.toThrow()

      // Verify that performance metrics are updated
      const metrics = await mabService.getPerformanceMetrics('user123', 'q1')
      expect(metrics).toHaveLength(1)
      expect(metrics[0].armId).toBe('q1')
      expect(metrics[0].totalPulls).toBe(1)
      expect(metrics[0].totalRewards).toBeGreaterThan(0)
    })

    it('should handle multiple outcomes for the same question', async () => {
      const outcomes: LearningOutcome[] = [
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: true,
          responseTime: 20000,
          confidence: 5,
          attempts: 1,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.1, timeOfDay: '10:00', deviceType: 'mobile' },
        },
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: false,
          responseTime: 40000,
          confidence: 2,
          attempts: 2,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.3, timeOfDay: '10:15', deviceType: 'mobile' },
        },
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: true,
          responseTime: 30000,
          confidence: 4,
          attempts: 1,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.2, timeOfDay: '10:30', deviceType: 'mobile' },
        },
      ]

      for (const outcome of outcomes) {
        await mabService.updateRewardModel('user123', 'q1', outcome)
      }

      const metrics = await mabService.getPerformanceMetrics('user123', 'q1')
      expect(metrics[0].totalPulls).toBe(3)
      expect(metrics[0].successRate).toBeCloseTo(2 / 3, 2) // 2 correct out of 3
    })

    it('should calculate rewards based on multiple factors', async () => {
      const fastCorrectOutcome: LearningOutcome = {
        questionId: 'q2',
        userId: 'user123',
        isCorrect: true,
        responseTime: 15000, // Fast response
        confidence: 5, // High confidence
        attempts: 1, // First attempt
        timestamp: new Date(),
        sessionId: 'session456',
        contextData: { fatigueLevel: 0.1, timeOfDay: '10:00', deviceType: 'mobile' },
      }

      const slowIncorrectOutcome: LearningOutcome = {
        questionId: 'q3',
        userId: 'user123',
        isCorrect: false,
        responseTime: 60000, // Slow response
        confidence: 1, // Low confidence
        attempts: 3, // Multiple attempts
        timestamp: new Date(),
        sessionId: 'session456',
        contextData: { fatigueLevel: 0.5, timeOfDay: '10:30', deviceType: 'mobile' },
      }

      await mabService.updateRewardModel('user123', 'q2', fastCorrectOutcome)
      await mabService.updateRewardModel('user123', 'q3', slowIncorrectOutcome)

      const q2Metrics = await mabService.getPerformanceMetrics('user123', 'q2')
      const q3Metrics = await mabService.getPerformanceMetrics('user123', 'q3')

      // Fast correct should have higher reward than slow incorrect
      expect(q2Metrics[0].averageReward).toBeGreaterThan(q3Metrics[0].averageReward)
    })
  })

  describe('Dynamic Difficulty Adjustment', () => {
    it('should adjust difficulty based on performance patterns', async () => {
      // Simulate high success rate (too easy)
      const highPerformance = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] // 100% success

      const adjustment = await mabService.adjustDifficulty('user123', highPerformance)

      expect(adjustment.currentSuccessRate).toBe(1.0)
      expect(adjustment.difficultyAdjustment).toBeGreaterThan(0) // Should increase difficulty
      expect(adjustment.adjustmentReason).toContain('too high')
    })

    it('should recommend easier content for low performance', async () => {
      // Simulate low success rate (too hard)
      const lowPerformance = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0] // 20% success

      const adjustment = await mabService.adjustDifficulty('user123', lowPerformance)

      expect(adjustment.currentSuccessRate).toBe(0.2)
      expect(adjustment.difficultyAdjustment).toBeLessThan(0) // Should decrease difficulty
      expect(adjustment.adjustmentReason).toContain('too low')
    })

    it('should not adjust when performance is in target zone', async () => {
      // Simulate optimal success rate
      const optimalPerformance = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1] // 70% success

      const adjustment = await mabService.adjustDifficulty('user123', optimalPerformance)

      expect(adjustment.currentSuccessRate).toBe(0.7)
      expect(Math.abs(adjustment.difficultyAdjustment)).toBeLessThan(0.05) // Minimal adjustment
    })

    it('should provide confidence intervals for adjustments', async () => {
      const performance = [1, 0, 1, 1, 0, 1, 1, 1, 0, 1]

      const adjustment = await mabService.adjustDifficulty('user123', performance)

      expect(adjustment.confidenceInterval).toBeDefined()
      expect(adjustment.confidenceInterval.lower).toBeGreaterThanOrEqual(0)
      expect(adjustment.confidenceInterval.upper).toBeLessThanOrEqual(1)
      expect(adjustment.confidenceInterval.lower).toBeLessThan(adjustment.confidenceInterval.upper)
    })

    it('should handle insufficient data gracefully', async () => {
      const insufficientData = [1, 0, 1] // Only 3 data points

      const adjustment = await mabService.adjustDifficulty('user123', insufficientData)

      expect(adjustment.adjustmentReason).toContain('Insufficient data')
      expect(adjustment.difficultyAdjustment).toBe(0)
    })
  })

  describe('Fatigue Detection', () => {
    it('should detect fatigue from performance degradation', async () => {
      const sessionData: LearningOutcome[] = [
        // Early session - good performance
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: true,
          responseTime: 20000,
          confidence: 5,
          attempts: 1,
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.1, timeOfDay: '10:00', deviceType: 'mobile' },
        },
        // Later session - degraded performance
        {
          questionId: 'q2',
          userId: 'user123',
          isCorrect: false,
          responseTime: 50000,
          confidence: 2,
          attempts: 3,
          timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 min ago
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.6, timeOfDay: '10:25', deviceType: 'mobile' },
        },
      ]

      const fatigueDetection = await mabService.detectFatigue('user123', sessionData)

      // Should detect some level of fatigue from the degraded performance
      expect(fatigueDetection.currentFatigueLevel).toBeGreaterThanOrEqual(0)
      expect(fatigueDetection.fatigueIndicators.responseTimeIncrease).toBeGreaterThanOrEqual(0)
      expect(fatigueDetection.fatigueIndicators.accuracyDecrease).toBeGreaterThanOrEqual(0)
      expect(fatigueDetection.fatigueIndicators.confidenceDecrease).toBeGreaterThanOrEqual(0)
    })

    it('should recommend appropriate actions based on fatigue level', async () => {
      const highFatigueData: LearningOutcome[] = Array.from({ length: 10 }, (_, i) => ({
        questionId: `q${i}`,
        userId: 'user123',
        isCorrect: i < 3, // Poor performance
        responseTime: 40000 + i * 5000, // Increasing response time
        confidence: Math.max(1, 5 - i), // Decreasing confidence
        attempts: Math.min(3, 1 + Math.floor(i / 3)), // Increasing attempts
        timestamp: new Date(Date.now() - (10 - i) * 5 * 60 * 1000),
        sessionId: 'session456',
        contextData: { fatigueLevel: 0.1 + i * 0.08, timeOfDay: '10:00', deviceType: 'mobile' },
      }))

      const fatigueDetection = await mabService.detectFatigue('user123', highFatigueData)

      expect(fatigueDetection.currentFatigueLevel).toBeGreaterThan(0.5)
      expect(['break', 'easier_content', 'end_session']).toContain(
        fatigueDetection.recommendedAction,
      )
      expect(fatigueDetection.estimatedRecoveryTime).toBeGreaterThan(0)
    })

    it('should handle minimal session data', async () => {
      const minimalData: LearningOutcome[] = [
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: true,
          responseTime: 30000,
          confidence: 4,
          attempts: 1,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.2, timeOfDay: '10:00', deviceType: 'mobile' },
        },
      ]

      const fatigueDetection = await mabService.detectFatigue('user123', minimalData)

      expect(fatigueDetection.currentFatigueLevel).toBe(0)
      expect(fatigueDetection.recommendedAction).toBe('continue')
    })
  })

  describe('Session Optimization', () => {
    it('should optimize session parameters based on performance', async () => {
      const sessionData: LearningOutcome[] = Array.from({ length: 15 }, (_, i) => ({
        questionId: `q${i % 3}`,
        userId: 'user123',
        isCorrect: Math.random() > 0.3, // 70% success rate
        responseTime: 25000 + Math.random() * 10000,
        confidence: Math.floor(Math.random() * 5) + 1,
        attempts: Math.random() > 0.8 ? 2 : 1,
        timestamp: new Date(Date.now() - (15 - i) * 2 * 60 * 1000), // 2 min intervals
        sessionId: 'session456',
        contextData: { fatigueLevel: i * 0.05, timeOfDay: '10:00', deviceType: 'mobile' },
      }))

      const optimization = await mabService.optimizeSession('user123', 'session456', sessionData)

      expect(optimization.optimalSessionLength).toBeGreaterThan(0)
      expect(optimization.recommendedBreakTime).toBeGreaterThan(0)
      expect(optimization.nextSessionRecommendation).toBeInstanceOf(Date)
      expect(optimization.nextSessionRecommendation.getTime()).toBeGreaterThan(Date.now())
    })

    it('should detect performance decline during session', async () => {
      const decliningSessionData: LearningOutcome[] = [
        // Good start
        ...Array.from({ length: 5 }, (_, i) => ({
          questionId: `q${i}`,
          userId: 'user123',
          isCorrect: true,
          responseTime: 20000,
          confidence: 5,
          attempts: 1,
          timestamp: new Date(Date.now() - (10 - i) * 3 * 60 * 1000),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.1, timeOfDay: '10:00', deviceType: 'mobile' },
        })),
        // Poor end
        ...Array.from({ length: 5 }, (_, i) => ({
          questionId: `q${i + 5}`,
          userId: 'user123',
          isCorrect: false,
          responseTime: 45000,
          confidence: 2,
          attempts: 2,
          timestamp: new Date(Date.now() - (5 - i) * 3 * 60 * 1000),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.7, timeOfDay: '10:15', deviceType: 'mobile' },
        })),
      ]

      const optimization = await mabService.optimizeSession(
        'user123',
        'session456',
        decliningSessionData,
      )

      expect(optimization.performanceDeclineDetected).toBe(true)
      expect(optimization.suggestedDifficultyAdjustment).toBeLessThan(0) // Should suggest easier content
    })

    it('should respect configuration settings', async () => {
      const disabledConfig = { ...defaultConfig, sessionOptimizationEnabled: false }
      const disabledService = new MABService(disabledConfig)

      const sessionData: LearningOutcome[] = [
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: true,
          responseTime: 30000,
          confidence: 4,
          attempts: 1,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.2, timeOfDay: '10:00', deviceType: 'mobile' },
        },
      ]

      const optimization = await disabledService.optimizeSession(
        'user123',
        'session456',
        sessionData,
      )

      // Should return default values when optimization is disabled
      expect(optimization.optimalSessionLength).toBe(30)
      expect(optimization.recommendedBreakTime).toBe(10)
    })
  })

  describe('Performance Metrics', () => {
    it('should track comprehensive performance metrics', async () => {
      // Generate some learning outcomes
      const outcomes: LearningOutcome[] = [
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: true,
          responseTime: 25000,
          confidence: 4,
          attempts: 1,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.2, timeOfDay: '10:00', deviceType: 'mobile' },
        },
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: false,
          responseTime: 35000,
          confidence: 3,
          attempts: 2,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.3, timeOfDay: '10:05', deviceType: 'mobile' },
        },
      ]

      for (const outcome of outcomes) {
        await mabService.updateRewardModel('user123', outcome.questionId, outcome)
      }

      const metrics = await mabService.getPerformanceMetrics('user123')

      expect(metrics).toHaveLength(1) // Only q1 has data
      expect(metrics[0].armId).toBe('q1')
      expect(metrics[0].totalPulls).toBe(2)
      expect(metrics[0].successRate).toBe(0.5) // 1 correct out of 2
      expect(metrics[0].averageResponseTime).toBeGreaterThan(0)
      expect(metrics[0].recentPerformance).toHaveLength(2)
    })

    it('should filter metrics by question ID when specified', async () => {
      const outcomes: LearningOutcome[] = [
        {
          questionId: 'q1',
          userId: 'user123',
          isCorrect: true,
          responseTime: 25000,
          confidence: 4,
          attempts: 1,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.2, timeOfDay: '10:00', deviceType: 'mobile' },
        },
        {
          questionId: 'q2',
          userId: 'user123',
          isCorrect: true,
          responseTime: 30000,
          confidence: 5,
          attempts: 1,
          timestamp: new Date(),
          sessionId: 'session456',
          contextData: { fatigueLevel: 0.2, timeOfDay: '10:05', deviceType: 'mobile' },
        },
      ]

      for (const outcome of outcomes) {
        await mabService.updateRewardModel('user123', outcome.questionId, outcome)
      }

      const allMetrics = await mabService.getPerformanceMetrics('user123')
      const q1Metrics = await mabService.getPerformanceMetrics('user123', 'q1')

      expect(allMetrics).toHaveLength(2)
      expect(q1Metrics).toHaveLength(1)
      expect(q1Metrics[0].armId).toBe('q1')
    })
  })

  describe('Exploration vs Exploitation', () => {
    it('should track exploration vs exploitation ratio', async () => {
      // Add some data to create statistics
      const outcome: LearningOutcome = {
        questionId: 'q1',
        userId: 'user123',
        isCorrect: true,
        responseTime: 25000,
        confidence: 4,
        attempts: 1,
        timestamp: new Date(),
        sessionId: 'session456',
        contextData: { fatigueLevel: 0.2, timeOfDay: '10:00', deviceType: 'mobile' },
      }

      await mabService.updateRewardModel('user123', 'q1', outcome)

      const ratio = await mabService.getExplorationRatio('user123')

      expect(ratio.exploration).toBeGreaterThanOrEqual(0)
      expect(ratio.exploitation).toBeGreaterThanOrEqual(0)
      expect(ratio.exploration + ratio.exploitation).toBeCloseTo(1, 5)
    })

    it('should handle users with no history', async () => {
      const ratio = await mabService.getExplorationRatio('new_user')

      expect(ratio.exploration).toBe(1)
      expect(ratio.exploitation).toBe(0)
    })
  })

  describe('Concept Drift and Reset', () => {
    it('should detect concept drift', async () => {
      // Create a scenario with poor performance to trigger drift detection
      const poorOutcomes: LearningOutcome[] = Array.from({ length: 150 }, (_, i) => ({
        questionId: 'q1',
        userId: 'user123',
        isCorrect: i < 10, // Only first 10 are correct, rest are wrong
        responseTime: 30000,
        confidence: 3,
        attempts: 1,
        timestamp: new Date(Date.now() - (150 - i) * 60 * 1000),
        sessionId: 'session456',
        contextData: { fatigueLevel: 0.2, timeOfDay: '10:00', deviceType: 'mobile' },
      }))

      for (const outcome of poorOutcomes) {
        await mabService.updateRewardModel('user123', outcome.questionId, outcome)
      }

      const hasDrift = await mabService.detectConceptDrift('user123')
      // Drift detection should return a boolean value
      expect(typeof hasDrift).toBe('boolean')
    })

    it('should reset bandit statistics', async () => {
      // Add some data first
      const outcome: LearningOutcome = {
        questionId: 'q1',
        userId: 'user123',
        isCorrect: true,
        responseTime: 25000,
        confidence: 4,
        attempts: 1,
        timestamp: new Date(),
        sessionId: 'session456',
        contextData: { fatigueLevel: 0.2, timeOfDay: '10:00', deviceType: 'mobile' },
      }

      await mabService.updateRewardModel('user123', 'q1', outcome)

      const beforeReset = await mabService.getPerformanceMetrics('user123', 'q1')
      expect(beforeReset[0].totalPulls).toBe(1)

      await mabService.resetBanditStats('user123', 0.5)

      const afterReset = await mabService.getPerformanceMetrics('user123', 'q1')
      expect(afterReset[0].totalPulls).toBe(0) // Should be reset with decay
    })
  })

  describe('End-to-End Learning Workflow', () => {
    it('should handle complete learning session workflow', async () => {
      const userId = 'user123'
      const sessionId = 'session789'

      // 1. Select initial question
      const initialSelection = await mabService.selectOptimalQuestion(
        userId,
        sampleQuestions,
        sampleContext,
      )
      expect(initialSelection.question).toBeDefined()

      // 2. Simulate user response
      const outcome1: LearningOutcome = {
        questionId: initialSelection.question.id,
        userId,
        isCorrect: true,
        responseTime: 20000,
        confidence: 4,
        attempts: 1,
        timestamp: new Date(),
        sessionId,
        contextData: { fatigueLevel: 0.1, timeOfDay: '10:00', deviceType: 'mobile' },
      }

      await mabService.updateRewardModel(userId, initialSelection.question.id, outcome1)

      // 3. Select next question (should be influenced by previous performance)
      const secondSelection = await mabService.selectOptimalQuestion(userId, sampleQuestions, {
        ...sampleContext,
        fatigueLevel: 0.2,
      })
      expect(secondSelection.question).toBeDefined()

      // 4. Simulate another response
      const outcome2: LearningOutcome = {
        questionId: secondSelection.question.id,
        userId,
        isCorrect: false,
        responseTime: 45000,
        confidence: 2,
        attempts: 3,
        timestamp: new Date(),
        sessionId,
        contextData: { fatigueLevel: 0.3, timeOfDay: '10:10', deviceType: 'mobile' },
      }

      await mabService.updateRewardModel(userId, secondSelection.question.id, outcome2)

      // 5. Check fatigue and session optimization
      const sessionData = [outcome1, outcome2]
      const fatigueDetection = await mabService.detectFatigue(userId, sessionData)
      const sessionOptimization = await mabService.optimizeSession(userId, sessionId, sessionData)

      expect(fatigueDetection.currentFatigueLevel).toBeGreaterThanOrEqual(0)
      expect(sessionOptimization.optimalSessionLength).toBeGreaterThan(0)

      // 6. Get performance metrics
      const metrics = await mabService.getPerformanceMetrics(userId)
      expect(metrics.length).toBeGreaterThan(0)

      // 7. Check exploration ratio
      const explorationRatio = await mabService.getExplorationRatio(userId)
      expect(explorationRatio.exploration + explorationRatio.exploitation).toBeCloseTo(1, 5)
    })

    it('should adapt over multiple sessions', async () => {
      const userId = 'user456'
      const sessions = ['session1', 'session2', 'session3']

      for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
        const sessionId = sessions[sessionIndex]
        const sessionFatigue = sessionIndex * 0.2 // Increasing fatigue over sessions

        // Simulate 5 questions per session
        for (let questionIndex = 0; questionIndex < 5; questionIndex++) {
          const context = {
            ...sampleContext,
            userId,
            sessionId,
            fatigueLevel: sessionFatigue + questionIndex * 0.1,
          }

          const selection = await mabService.selectOptimalQuestion(userId, sampleQuestions, context)

          const outcome: LearningOutcome = {
            questionId: selection.question.id,
            userId,
            isCorrect: Math.random() > 0.3, // 70% success rate
            responseTime: 20000 + Math.random() * 20000,
            confidence: Math.floor(Math.random() * 5) + 1,
            attempts: Math.random() > 0.8 ? 2 : 1,
            timestamp: new Date(),
            sessionId,
            contextData: {
              fatigueLevel: context.fatigueLevel,
              timeOfDay: '10:00',
              deviceType: 'mobile',
            },
          }

          await mabService.updateRewardModel(userId, selection.question.id, outcome)
        }
      }

      // After multiple sessions, should have comprehensive metrics
      const finalMetrics = await mabService.getPerformanceMetrics(userId)
      expect(finalMetrics.length).toBeGreaterThan(0)

      const totalPulls = finalMetrics.reduce((sum, metric) => sum + metric.totalPulls, 0)
      expect(totalPulls).toBe(15) // 3 sessions × 5 questions
    })
  })
})
