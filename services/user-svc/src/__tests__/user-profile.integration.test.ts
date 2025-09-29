import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { FastifyInstance } from 'fastify'
import { createTestServer } from './setup'
import { db } from '../db/connection'
import { users, learningEvents, userSessions, knowledgeStates } from '../db/schema'
import { eq } from 'drizzle-orm'
import { AuthService } from '../services/auth.service'

describe('User Profile Integration Tests', () => {
  let server: FastifyInstance
  let testUser: {
    id: string
    email: string
    accessToken: string
  }

  beforeAll(async () => {
    server = await createTestServer()
  })

  afterAll(async () => {
    await server.close()
  })

  beforeEach(async () => {
    // Clean up test data
    await db.delete(learningEvents)
    await db.delete(userSessions)
    await db.delete(knowledgeStates)
    await db.delete(users)

    // Create test user
    const registerResponse = await server.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        cognitivePatterns: {
          learningStyle: 'visual',
          processingSpeed: 1.2,
          attentionSpan: 30,
          preferredSessionLength: 45,
          optimalTimeOfDay: ['morning'],
          difficultyPreference: 'gradual',
          feedbackPreference: 'immediate',
        },
        learningPreferences: {
          enableNotifications: true,
          notificationFrequency: 'medium',
          studyReminders: true,
          socialFeatures: true,
          gamificationEnabled: true,
          preferredLanguage: 'en',
        },
      },
    })

    expect(registerResponse.statusCode).toBe(201)
    const registerData = registerResponse.json()

    testUser = {
      id: registerData.data.user.id,
      email: registerData.data.user.email,
      accessToken: registerData.data.accessToken,
    }
  })

  describe('GET /users/profile', () => {
    it('should return user profile with cognitive patterns', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users/profile',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()

      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        firstName: 'Test',
        lastName: 'User',
        cognitivePatterns: {
          learningStyle: 'visual',
          processingSpeed: 1.2,
          attentionSpan: 30,
          preferredSessionLength: 45,
          optimalTimeOfDay: ['morning'],
          difficultyPreference: 'gradual',
          feedbackPreference: 'immediate',
        },
        learningPreferences: {
          enableNotifications: true,
          notificationFrequency: 'medium',
          studyReminders: true,
          socialFeatures: true,
          gamificationEnabled: true,
          preferredLanguage: 'en',
        },
      })
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users/profile',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should return 404 for non-existent user', async () => {
      // Create token for non-existent user
      const fakeToken = AuthService.generateAccessToken({
        userId: '00000000-0000-0000-0000-000000000000',
        email: 'fake@example.com',
        roles: ['user'],
      })

      const response = await server.inject({
        method: 'GET',
        url: '/users/profile',
        headers: {
          authorization: `Bearer ${fakeToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('PUT /users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        cognitivePatterns: {
          learningStyle: 'kinesthetic',
          processingSpeed: 1.5,
          attentionSpan: 25,
        },
        learningPreferences: {
          notificationFrequency: 'high',
          gamificationEnabled: false,
        },
      }

      const response = await server.inject({
        method: 'PUT',
        url: '/users/profile',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: updateData,
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()

      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        firstName: 'Updated',
        lastName: 'Name',
        cognitivePatterns: expect.objectContaining({
          learningStyle: 'kinesthetic',
          processingSpeed: 1.5,
          attentionSpan: 25,
          // Should preserve existing values
          preferredSessionLength: 45,
          optimalTimeOfDay: ['morning'],
        }),
        learningPreferences: expect.objectContaining({
          notificationFrequency: 'high',
          gamificationEnabled: false,
          // Should preserve existing values
          enableNotifications: true,
          studyReminders: true,
        }),
      })
    })

    it('should validate cognitive pattern constraints', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/users/profile',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          cognitivePatterns: {
            processingSpeed: 3.0, // Invalid: max is 2.0
            attentionSpan: 200, // Invalid: max is 120
          },
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('GET /users/progress', () => {
    beforeEach(async () => {
      // Create test learning data
      const sessionId = '550e8400-e29b-41d4-a716-446655440000'

      // Create user session
      await db.insert(userSessions).values({
        userId: testUser.id,
        sessionId,
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(),
        duration: 3600, // 1 hour
        questionsAttempted: 10,
        questionsCorrect: 8,
        xpEarned: 80,
        conceptsStudied: ['traffic-signs', 'road-rules'],
        isCompleted: true,
      })

      // Create learning events
      await db.insert(learningEvents).values([
        {
          userId: testUser.id,
          sessionId,
          eventType: 'question_answered',
          conceptId: '550e8400-e29b-41d4-a716-446655440001',
          responseData: {
            isCorrect: true,
            responseTime: 2500,
            confidenceLevel: 0.8,
            hintsUsed: 0,
            attemptsCount: 1,
          },
          contextData: {
            deviceType: 'desktop',
            sessionId,
            timeOfDay: 'morning',
            networkCondition: 'excellent',
          },
        },
        {
          userId: testUser.id,
          sessionId,
          eventType: 'question_answered',
          conceptId: '550e8400-e29b-41d4-a716-446655440002',
          responseData: {
            isCorrect: false,
            responseTime: 4500,
            confidenceLevel: 0.4,
            hintsUsed: 1,
            attemptsCount: 2,
          },
          contextData: {
            deviceType: 'desktop',
            sessionId,
            timeOfDay: 'morning',
            networkCondition: 'excellent',
          },
        },
      ])

      // Create knowledge states
      await db.insert(knowledgeStates).values([
        {
          userId: testUser.id,
          conceptId: '550e8400-e29b-41d4-a716-446655440001',
          masteryProbability: 0.85, // Mastered
          interactionCount: 5,
          correctCount: 4,
        },
        {
          userId: testUser.id,
          conceptId: '550e8400-e29b-41d4-a716-446655440002',
          masteryProbability: 0.65, // Not mastered
          interactionCount: 3,
          correctCount: 1,
        },
      ])
    })

    it('should return comprehensive user progress', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users/progress',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()

      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        totalSessions: 1,
        totalQuestions: 10,
        correctAnswers: 8,
        averageAccuracy: 80,
        totalStudyTime: 60, // 1 hour in minutes
        conceptsMastered: 1, // Only one concept with mastery > 0.8
        currentStreak: 0,
        longestStreak: 0,
        totalXP: expect.any(Number),
        recentAchievements: [],
        weeklyProgress: expect.any(Array),
      })
    })
  })

  describe('POST /users/progress', () => {
    it('should update user progress after learning activity', async () => {
      const progressUpdate = {
        conceptId: '550e8400-e29b-41d4-a716-446655440001',
        isCorrect: true,
        responseTime: 2500,
        confidenceLevel: 0.8,
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
      }

      const response = await server.inject({
        method: 'POST',
        url: '/users/progress',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: progressUpdate,
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()

      expect(data.success).toBe(true)
      expect(data.data.message).toBe('Progress updated successfully')

      // Verify learning event was created
      const events = await db
        .select()
        .from(learningEvents)
        .where(eq(learningEvents.userId, testUser.id))

      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        userId: testUser.id,
        eventType: 'question_answered',
        conceptId: progressUpdate.conceptId,
        responseData: expect.objectContaining({
          isCorrect: true,
          responseTime: 2500,
          confidenceLevel: 0.8,
        }),
      })
    })

    it('should validate progress update data', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/progress',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          conceptId: 'invalid-uuid',
          isCorrect: true,
          responseTime: -100, // Invalid
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /users/cognitive-analysis', () => {
    beforeEach(async () => {
      // Create sufficient learning data for analysis
      const sessionIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
      ]

      // Create multiple sessions with different patterns
      for (let i = 0; i < sessionIds.length; i++) {
        const sessionId = sessionIds[i]
        const startTime = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000) // i+1 days ago

        await db.insert(userSessions).values({
          userId: testUser.id,
          sessionId,
          startTime,
          endTime: new Date(startTime.getTime() + 1800000), // 30 minutes later
          duration: 1800,
          questionsAttempted: 15,
          questionsCorrect: 12,
          xpEarned: 120,
          deviceInfo: {
            deviceType: i % 2 === 0 ? 'desktop' : 'mobile',
            sessionId,
            timeOfDay: 'morning',
            networkCondition: 'excellent',
          },
          isCompleted: true,
        })

        // Create learning events for each session
        for (let j = 0; j < 15; j++) {
          await db.insert(learningEvents).values({
            userId: testUser.id,
            sessionId,
            eventType: 'question_answered',
            responseData: {
              isCorrect: j < 12, // 12 correct out of 15
              responseTime: 2000 + Math.random() * 2000, // 2-4 seconds
              confidenceLevel: 0.7 + Math.random() * 0.3,
              hintsUsed: 0,
              attemptsCount: 1,
            },
            contextData: {
              deviceType: i % 2 === 0 ? 'desktop' : 'mobile',
              sessionId,
              timeOfDay: 'morning',
              networkCondition: 'excellent',
            },
            timestamp: new Date(startTime.getTime() + j * 60000), // 1 minute apart
          })
        }
      }
    })

    it('should analyze cognitive patterns from user behavior', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/cognitive-analysis',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()

      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        learningStyle: expect.any(String),
        processingSpeed: expect.any(Number),
        attentionSpan: expect.any(Number),
        preferredSessionLength: expect.any(Number),
        optimalTimeOfDay: expect.any(Array),
        difficultyPreference: expect.stringMatching(/^(gradual|challenging|mixed)$/),
        feedbackPreference: expect.stringMatching(/^(immediate|delayed|summary)$/),
        confidence: expect.any(Number),
      })

      expect(data.data.processingSpeed).toBeGreaterThan(0.1)
      expect(data.data.processingSpeed).toBeLessThan(2.0)
      expect(data.data.confidence).toBeGreaterThan(0)
      expect(data.data.confidence).toBeLessThanOrEqual(1)
    })

    it('should update user cognitive patterns if confidence is high', async () => {
      await server.inject({
        method: 'POST',
        url: '/users/cognitive-analysis',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      // Check if user's cognitive patterns were updated
      const profileResponse = await server.inject({
        method: 'GET',
        url: '/users/profile',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(profileResponse.statusCode).toBe(200)
      const profileData = profileResponse.json()

      // Cognitive patterns should be updated based on analysis
      expect(profileData.data.cognitivePatterns).toBeDefined()
      expect(profileData.data.updatedAt).toBeDefined()
    })
  })

  describe('GET /users/export', () => {
    it('should export all user data for GDPR compliance', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users/export',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()

      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        user: expect.objectContaining({
          id: testUser.id,
          email: testUser.email,
        }),
        knowledgeStates: expect.any(Array),
        learningEvents: expect.any(Array),
        userSessions: expect.any(Array),
        userAchievements: expect.any(Array),
        exportedAt: expect.any(String),
      })

      // Check response headers for file download
      expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
      expect(response.headers['content-disposition']).toContain('attachment')
    })
  })

  describe('POST /users/delete-request', () => {
    it('should schedule data deletion for GDPR compliance', async () => {
      const deletionRequest = {
        reason: 'User requested account deletion for privacy reasons',
        scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      }

      const response = await server.inject({
        method: 'POST',
        url: '/users/delete-request',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: deletionRequest,
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()

      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        userId: testUser.id,
        reason: deletionRequest.reason,
        requestedAt: expect.any(String),
        scheduledFor: expect.any(String),
      })

      // Verify user is marked as inactive
      const [user] = await db
        .select({ isActive: users.isActive })
        .from(users)
        .where(eq(users.id, testUser.id))

      expect(user.isActive).toBe(false)
    })

    it('should validate deletion request data', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/delete-request',
        headers: {
          authorization: `Bearer ${testUser.accessToken}`,
        },
        payload: {
          reason: 'Too short', // Invalid: minimum 10 characters
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })
})
