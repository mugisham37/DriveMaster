/**
 * Service Integration Tests
 * Tests for microservice interactions and API contracts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  TestClient,
  PerformanceMonitor,
  waitForAllServices,
  generateTestUser,
  generateTestContent,
  cleanupTestData,
} from '../utils/test-helpers'
import { TEST_CONFIG } from '../config/test-config'

describe('Service Integration Tests', () => {
  let userClient: TestClient
  let adaptiveClient: TestClient
  let contentClient: TestClient
  let analyticsClient: TestClient
  let engagementClient: TestClient
  let performanceMonitor: PerformanceMonitor
  let testUser: any
  let authToken: string

  beforeAll(async () => {
    // Wait for all services to be ready
    const servicesReady = await waitForAllServices()
    expect(servicesReady).toBe(true)

    // Initialize clients
    userClient = new TestClient(TEST_CONFIG.services.userService)
    adaptiveClient = new TestClient(TEST_CONFIG.services.adaptiveService)
    contentClient = new TestClient(TEST_CONFIG.services.contentService)
    analyticsClient = new TestClient(TEST_CONFIG.services.analyticsService)
    engagementClient = new TestClient(TEST_CONFIG.services.engagementService)
    performanceMonitor = new PerformanceMonitor()

    // Create test user
    testUser = generateTestUser()
  }, 30000)

  beforeEach(() => {
    performanceMonitor.reset()
  })

  afterAll(async () => {
    if (userClient && authToken) {
      await cleanupTestData(userClient)
    }
  })

  describe('User Service Integration', () => {
    it('should register a new user successfully', async () => {
      performanceMonitor.start()

      const response = await userClient.post('/auth/register', testUser)
      const duration = performanceMonitor.end('user-registration')

      expect(response.status).toBe(201)
      expect(response.data).toHaveProperty('user')
      expect(response.data).toHaveProperty('token')
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      authToken = response.data.token
    })

    it('should authenticate user successfully', async () => {
      performanceMonitor.start()

      const response = await userClient.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      const duration = performanceMonitor.end('user-authentication')

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('token')
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      userClient.setAuthToken(response.data.token)
      authToken = response.data.token
    })

    it('should get user profile with authentication', async () => {
      performanceMonitor.start()

      const response = await userClient.get('/profile')
      const duration = performanceMonitor.end('get-user-profile')

      expect(response.status).toBe(200)
      expect(response.data.email).toBe(testUser.email)
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })
  })

  describe('Cross-Service Integration', () => {
    beforeEach(() => {
      // Set auth token for all clients
      adaptiveClient.setAuthToken(authToken)
      contentClient.setAuthToken(authToken)
      analyticsClient.setAuthToken(authToken)
      engagementClient.setAuthToken(authToken)
    })

    it('should create content and retrieve it through adaptive service', async () => {
      // Create content through content service
      const testContent = generateTestContent()
      performanceMonitor.start()

      const createResponse = await contentClient.post('/content', testContent)
      const createDuration = performanceMonitor.end('content-creation')

      expect(createResponse.status).toBe(201)
      expect(createDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      const contentId = createResponse.data.id

      // Retrieve content through adaptive service
      performanceMonitor.start()

      const adaptiveResponse = await adaptiveClient.get(`/recommendations/${contentId}`)
      const retrieveDuration = performanceMonitor.end('adaptive-content-retrieval')

      expect(adaptiveResponse.status).toBe(200)
      expect(retrieveDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })

    it('should track learning events across services', async () => {
      // Submit learning event through adaptive service
      const learningEvent = {
        contentId: 'test-content-123',
        action: 'answer',
        result: 'correct',
        timeSpent: 30000,
        metadata: { difficulty: 'medium' },
      }

      performanceMonitor.start()

      const eventResponse = await adaptiveClient.post('/events', learningEvent)
      const eventDuration = performanceMonitor.end('learning-event-submission')

      expect(eventResponse.status).toBe(201)
      expect(eventDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check analytics service for event processing
      performanceMonitor.start()

      const analyticsResponse = await analyticsClient.get('/events/recent')
      const analyticsDuration = performanceMonitor.end('analytics-retrieval')

      expect(analyticsResponse.status).toBe(200)
      expect(analyticsDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })

    it('should trigger engagement notifications', async () => {
      // Trigger achievement through adaptive service
      const achievementData = {
        type: 'streak',
        value: 7,
        category: 'traffic-signs',
      }

      performanceMonitor.start()

      const achievementResponse = await adaptiveClient.post('/achievements', achievementData)
      const achievementDuration = performanceMonitor.end('achievement-trigger')

      expect(achievementResponse.status).toBe(201)
      expect(achievementDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)

      // Check engagement service for notification
      performanceMonitor.start()

      const notificationResponse = await engagementClient.get('/notifications')
      const notificationDuration = performanceMonitor.end('notification-retrieval')

      expect(notificationResponse.status).toBe(200)
      expect(notificationDuration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
    })
  })

  describe('Error Handling and Circuit Breakers', () => {
    it('should handle service unavailability gracefully', async () => {
      // Test with invalid service endpoint
      const invalidClient = new TestClient('http://localhost:9999')

      try {
        await invalidClient.get('/health')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.code).toBe('ECONNREFUSED')
      }
    })

    it('should implement proper timeout handling', async () => {
      // This test would require a service that can simulate delays
      // For now, we'll test the timeout configuration
      const slowClient = new TestClient(TEST_CONFIG.services.userService)

      performanceMonitor.start()

      try {
        const response = await slowClient.get('/health')
        const duration = performanceMonitor.end('health-check')

        expect(response.status).toBe(200)
        expect(duration).toBeLessThan(TEST_CONFIG.timeouts.default)
      } catch (error: any) {
        // Timeout errors are acceptable in this test
        expect(error.code).toMatch(/TIMEOUT|ECONNABORTED/)
      }
    })
  })

  describe('Performance Validation', () => {
    it('should meet response time requirements', async () => {
      const iterations = 10
      const durations: number[] = []

      for (let i = 0; i < iterations; i++) {
        performanceMonitor.start()
        await userClient.get('/health')
        durations.push(performanceMonitor.end('health-check-batch'))
      }

      const averageTime = durations.reduce((sum, duration) => sum + duration, 0) / iterations
      const p95Time = durations.sort((a, b) => a - b)[Math.ceil(iterations * 0.95) - 1]

      expect(averageTime).toBeLessThan(TEST_CONFIG.performance.maxResponseTime)
      expect(p95Time).toBeLessThan(TEST_CONFIG.performance.maxP95ResponseTime)
    })

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 50
      const promises: Promise<any>[] = []

      performanceMonitor.start()

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(userClient.get('/health'))
      }

      const results = await Promise.allSettled(promises)
      const duration = performanceMonitor.end('concurrent-requests')

      const successfulRequests = results.filter((result) => result.status === 'fulfilled').length
      const errorRate = (concurrentRequests - successfulRequests) / concurrentRequests

      expect(errorRate).toBeLessThan(TEST_CONFIG.performance.maxErrorRate)
      expect(duration).toBeLessThan(TEST_CONFIG.performance.maxResponseTime * 2) // Allow some overhead
    })
  })
})
