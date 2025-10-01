/**
 * End-to-End User Learning Flow Tests
 * Complete user journey testing from registration to learning completion
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  TestClient,
  PerformanceMonitor,
  waitForAllServices,
  generateTestUser,
  cleanupTestData,
} from '../utils/test-helpers'
import { TEST_CONFIG } from '../config/test-config'

describe('End-to-End User Learning Flow', () => {
  let apiClient: TestClient
  let performanceMonitor: PerformanceMonitor
  let testUser: any
  let authToken: string
  let userId: string

  beforeAll(async () => {
    // Wait for all services to be ready
    const servicesReady = await waitForAllServices()
    expect(servicesReady).toBe(true)

    // Use API Gateway for E2E tests
    apiClient = new TestClient(TEST_CONFIG.services.apiGateway)
    performanceMonitor = new PerformanceMonitor()
    testUser = generateTestUser('e2e')
  }, 30000)

  beforeEach(() => {
    performanceMonitor.reset()
  })

  afterAll(async () => {
    if (apiClient && authToken) {
      await cleanupTestData(apiClient)
    }
  })

  describe('Complete User Journey', () => {
    it('should complete full user registration and onboarding flow', async () => {
      // Step 1: User Registration
      performanceMonitor.start()

      const registrationResponse = await apiClient.post('/api/v1/auth/register', {
        ...testUser,
        preferences: {
          learningStyle: 'visual',
          difficultyPreference: 'adaptive',
          sessionDuration: 30,
          reminderTime: '18:00',
        },
      })

      const registrationDuration = performanceMonitor.end('user-registration')

      expect(registrationResponse.status).toBe(201)
      expect(registrationResponse.data).toHaveProperty('user')
      expect(registrationResponse.data).toHaveProperty('token')
      expect(registrationDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      authToken = registrationResponse.data.token
      userId = registrationResponse.data.user.id
      apiClient.setAuthToken(authToken)

      // Step 2: Initial Assessment
      performanceMonitor.start()

      const assessmentResponse = await apiClient.get('/api/v1/adaptive/initial-assessment')
      const assessmentDuration = performanceMonitor.end('initial-assessment')

      expect(assessmentResponse.status).toBe(200)
      expect(assessmentResponse.data).toHaveProperty('questions')
      expect(assessmentResponse.data.questions).toHaveLength(10)
      expect(assessmentDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      // Step 3: Complete Initial Assessment
      const questions = assessmentResponse.data.questions

      for (const question of questions) {
        performanceMonitor.start()

        const answerResponse = await apiClient.post('/api/v1/adaptive/answer', {
          questionId: question.id,
          answer: question.correctAnswer, // Simulate correct answers
          timeSpent: Math.floor(Math.random() * 30000) + 10000, // 10-40 seconds
          confidence: Math.floor(Math.random() * 5) + 1, // 1-5 scale
        })

        const answerDuration = performanceMonitor.end('answer-submission')

        expect(answerResponse.status).toBe(200)
        expect(answerResponse.data).toHaveProperty('feedback')
        expect(answerDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
      }

      // Step 4: Get Personalized Learning Path
      performanceMonitor.start()

      const learningPathResponse = await apiClient.get('/api/v1/adaptive/learning-path')
      const learningPathDuration = performanceMonitor.end('learning-path-generation')

      expect(learningPathResponse.status).toBe(200)
      expect(learningPathResponse.data).toHaveProperty('path')
      expect(learningPathResponse.data).toHaveProperty('estimatedDuration')
      expect(learningPathDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })

    it('should handle adaptive learning session with real-time updates', async () => {
      // Start learning session
      performanceMonitor.start()

      const sessionResponse = await apiClient.post('/api/v1/adaptive/session/start', {
        category: 'traffic-signs',
        targetDuration: 1800000, // 30 minutes
      })

      const sessionStartDuration = performanceMonitor.end('session-start')

      expect(sessionResponse.status).toBe(201)
      expect(sessionResponse.data).toHaveProperty('sessionId')
      expect(sessionStartDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      const sessionId = sessionResponse.data.sessionId

      // Simulate learning session with multiple questions
      for (let i = 0; i < 5; i++) {
        // Get next question
        performanceMonitor.start()

        const questionResponse = await apiClient.get(
          `/api/v1/adaptive/session/${sessionId}/next-question`,
        )
        const questionDuration = performanceMonitor.end('next-question')

        expect(questionResponse.status).toBe(200)
        expect(questionResponse.data).toHaveProperty('question')
        expect(questionDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

        const question = questionResponse.data.question

        // Submit answer (mix of correct and incorrect)
        const isCorrect = Math.random() > 0.3 // 70% correct rate
        const selectedAnswer = isCorrect
          ? question.correctAnswer
          : (question.correctAnswer + 1) % question.options.length

        performanceMonitor.start()

        const answerResponse = await apiClient.post(
          `/api/v1/adaptive/session/${sessionId}/answer`,
          {
            questionId: question.id,
            answer: selectedAnswer,
            timeSpent: Math.floor(Math.random() * 45000) + 15000, // 15-60 seconds
            confidence: Math.floor(Math.random() * 5) + 1,
          },
        )

        const answerDuration = performanceMonitor.end('session-answer')

        expect(answerResponse.status).toBe(200)
        expect(answerResponse.data).toHaveProperty('feedback')
        expect(answerResponse.data).toHaveProperty('knowledgeUpdate')
        expect(answerDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
      }

      // End session
      performanceMonitor.start()

      const endSessionResponse = await apiClient.post(`/api/v1/adaptive/session/${sessionId}/end`)
      const endSessionDuration = performanceMonitor.end('session-end')

      expect(endSessionResponse.status).toBe(200)
      expect(endSessionResponse.data).toHaveProperty('summary')
      expect(endSessionResponse.data).toHaveProperty('achievements')
      expect(endSessionDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })

    it('should track progress and generate analytics', async () => {
      // Get user progress
      performanceMonitor.start()

      const progressResponse = await apiClient.get('/api/v1/analytics/progress')
      const progressDuration = performanceMonitor.end('progress-retrieval')

      expect(progressResponse.status).toBe(200)
      expect(progressResponse.data).toHaveProperty('overallProgress')
      expect(progressResponse.data).toHaveProperty('categoryProgress')
      expect(progressResponse.data).toHaveProperty('streaks')
      expect(progressDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      // Get learning analytics
      performanceMonitor.start()

      const analyticsResponse = await apiClient.get('/api/v1/analytics/insights')
      const analyticsDuration = performanceMonitor.end('analytics-insights')

      expect(analyticsResponse.status).toBe(200)
      expect(analyticsResponse.data).toHaveProperty('learningVelocity')
      expect(analyticsResponse.data).toHaveProperty('strongAreas')
      expect(analyticsResponse.data).toHaveProperty('improvementAreas')
      expect(analyticsDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      // Get personalized recommendations
      performanceMonitor.start()

      const recommendationsResponse = await apiClient.get('/api/v1/adaptive/recommendations')
      const recommendationsDuration = performanceMonitor.end('recommendations')

      expect(recommendationsResponse.status).toBe(200)
      expect(recommendationsResponse.data).toHaveProperty('nextTopics')
      expect(recommendationsResponse.data).toHaveProperty('reviewItems')
      expect(recommendationsDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })

    it('should handle gamification and social features', async () => {
      // Get achievements
      performanceMonitor.start()

      const achievementsResponse = await apiClient.get('/api/v1/engagement/achievements')
      const achievementsDuration = performanceMonitor.end('achievements-retrieval')

      expect(achievementsResponse.status).toBe(200)
      expect(achievementsResponse.data).toHaveProperty('earned')
      expect(achievementsResponse.data).toHaveProperty('available')
      expect(achievementsDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      // Get leaderboard
      performanceMonitor.start()

      const leaderboardResponse = await apiClient.get('/api/v1/engagement/leaderboard')
      const leaderboardDuration = performanceMonitor.end('leaderboard-retrieval')

      expect(leaderboardResponse.status).toBe(200)
      expect(leaderboardResponse.data).toHaveProperty('rankings')
      expect(leaderboardDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      // Get notifications
      performanceMonitor.start()

      const notificationsResponse = await apiClient.get('/api/v1/engagement/notifications')
      const notificationsDuration = performanceMonitor.end('notifications-retrieval')

      expect(notificationsResponse.status).toBe(200)
      expect(notificationsResponse.data).toHaveProperty('notifications')
      expect(notificationsDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })

    it('should handle spaced repetition and review scheduling', async () => {
      // Get items due for review
      performanceMonitor.start()

      const reviewResponse = await apiClient.get('/api/v1/adaptive/review/due')
      const reviewDuration = performanceMonitor.end('review-items')

      expect(reviewResponse.status).toBe(200)
      expect(reviewResponse.data).toHaveProperty('items')
      expect(reviewDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      // Start review session
      if (reviewResponse.data.items.length > 0) {
        performanceMonitor.start()

        const reviewSessionResponse = await apiClient.post('/api/v1/adaptive/review/start')
        const reviewSessionDuration = performanceMonitor.end('review-session-start')

        expect(reviewSessionResponse.status).toBe(201)
        expect(reviewSessionResponse.data).toHaveProperty('sessionId')
        expect(reviewSessionDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
      }

      // Get next review schedule
      performanceMonitor.start()

      const scheduleResponse = await apiClient.get('/api/v1/adaptive/review/schedule')
      const scheduleDuration = performanceMonitor.end('review-schedule')

      expect(scheduleResponse.status).toBe(200)
      expect(scheduleResponse.data).toHaveProperty('upcomingReviews')
      expect(scheduleDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })
  })

  describe('Performance Under Load', () => {
    it('should maintain performance during concurrent user sessions', async () => {
      const concurrentSessions = 10
      const promises: Promise<any>[] = []

      performanceMonitor.start()

      // Simulate multiple concurrent learning sessions
      for (let i = 0; i < concurrentSessions; i++) {
        const sessionPromise = (async () => {
          const sessionResponse = await apiClient.post('/api/v1/adaptive/session/start', {
            category: 'road-rules',
            targetDuration: 600000, // 10 minutes
          })

          expect(sessionResponse.status).toBe(201)
          return sessionResponse.data.sessionId
        })()

        promises.push(sessionPromise)
      }

      const sessionIds = await Promise.all(promises)
      const concurrentDuration = performanceMonitor.end('concurrent-sessions')

      expect(sessionIds).toHaveLength(concurrentSessions)
      expect(concurrentDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime * 2)

      // Clean up sessions
      await Promise.all(
        sessionIds.map((sessionId) => apiClient.post(`/api/v1/adaptive/session/${sessionId}/end`)),
      )
    })
  })
})
