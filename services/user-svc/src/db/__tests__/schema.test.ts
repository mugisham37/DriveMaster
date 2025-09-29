import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { db } from '../connection'
import {
  users,
  concepts,
  content,
  knowledgeStates,
  learningEvents,
  userSessions,
  achievements,
  userAchievements,
  spacedRepetition,
  notifications,
  friendships,
  CognitivePatterns,
  LearningPreferences,
  ContentMetadata,
  ResponseData,
  ContextData,
} from '../schema'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcrypt'

describe('Database Schema Tests', () => {
  let testUserId: string
  let testConceptId: string
  let testContentId: string

  beforeAll(async () => {
    // Ensure we're using a test database
    if (!process.env.DB_NAME?.includes('test')) {
      throw new Error('Tests must run against a test database')
    }
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(learningEvents)
    await db.delete(userSessions)
    await db.delete(userAchievements)
    await db.delete(spacedRepetition)
    await db.delete(notifications)
    await db.delete(friendships)
    await db.delete(knowledgeStates)
    await db.delete(content)
    await db.delete(concepts)
    await db.delete(achievements)
    await db.delete(users)
  })

  afterAll(async () => {
    // Clean up after all tests
    await db.delete(learningEvents)
    await db.delete(userSessions)
    await db.delete(userAchievements)
    await db.delete(spacedRepetition)
    await db.delete(notifications)
    await db.delete(friendships)
    await db.delete(knowledgeStates)
    await db.delete(content)
    await db.delete(concepts)
    await db.delete(achievements)
    await db.delete(users)
  })

  describe('Users Table', () => {
    it('should create a user with cognitive patterns and learning preferences', async () => {
      const cognitivePatterns: CognitivePatterns = {
        learningStyle: 'visual',
        processingSpeed: 1.2,
        attentionSpan: 25,
        preferredSessionLength: 20,
        optimalTimeOfDay: ['morning', 'afternoon'],
        difficultyPreference: 'gradual',
        feedbackPreference: 'immediate',
      }

      const learningPreferences: LearningPreferences = {
        enableNotifications: true,
        notificationFrequency: 'medium',
        studyReminders: true,
        socialFeatures: true,
        gamificationEnabled: true,
        preferredLanguage: 'en',
        accessibilityOptions: {
          highContrast: false,
          largeText: false,
          screenReader: false,
          reducedMotion: false,
        },
      }

      const hashedPassword = await bcrypt.hash('testpassword', 10)

      const [user] = await db
        .insert(users)
        .values({
          email: 'test@example.com',
          passwordHash: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          cognitivePatterns,
          learningPreferences,
          totalXP: 100,
          currentStreak: 5,
          longestStreak: 10,
          emailVerified: true,
        })
        .returning()

      expect(user).toBeDefined()
      expect(user.email).toBe('test@example.com')
      expect(user.cognitivePatterns).toEqual(cognitivePatterns)
      expect(user.learningPreferences).toEqual(learningPreferences)
      expect(user.totalXP).toBe(100)

      testUserId = user.id
    })

    it('should enforce unique email constraint', async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10)

      await db.insert(users).values({
        email: 'duplicate@example.com',
        passwordHash: hashedPassword,
      })

      await expect(
        db.insert(users).values({
          email: 'duplicate@example.com',
          passwordHash: hashedPassword,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Concepts Table', () => {
    it('should create concepts with hierarchical structure', async () => {
      // Create parent concept
      const [parentConcept] = await db
        .insert(concepts)
        .values({
          key: 'traffic-signs',
          name: 'Traffic Signs',
          description: 'Understanding traffic signs',
          category: 'traffic_signs',
          baseDifficulty: 0.3,
          estimatedLearningTime: 15,
          prerequisites: [],
        })
        .returning()

      // Create child concept
      const [childConcept] = await db
        .insert(concepts)
        .values({
          key: 'regulatory-signs',
          name: 'Regulatory Signs',
          description: 'Signs that regulate traffic',
          category: 'traffic_signs',
          parentConceptId: parentConcept.id,
          baseDifficulty: 0.4,
          estimatedLearningTime: 20,
          prerequisites: ['traffic-signs'],
        })
        .returning()

      expect(parentConcept).toBeDefined()
      expect(childConcept).toBeDefined()
      expect(childConcept.parentConceptId).toBe(parentConcept.id)
      expect(childConcept.prerequisites).toEqual(['traffic-signs'])

      testConceptId = parentConcept.id
    })
  })

  describe('Content Table', () => {
    beforeEach(async () => {
      // Create a concept for content tests
      const [concept] = await db
        .insert(concepts)
        .values({
          key: 'test-concept',
          name: 'Test Concept',
          category: 'road_rules',
          baseDifficulty: 0.5,
        })
        .returning()
      testConceptId = concept.id
    })

    it('should create content with IRT parameters and metadata', async () => {
      const metadata: ContentMetadata = {
        tags: ['test', 'sample'],
        estimatedTime: 60,
        mediaType: 'text',
        accessibility: {
          altText: 'Test alt text',
          captions: true,
          transcript: false,
        },
        lastReviewed: new Date().toISOString(),
      }

      const [contentItem] = await db
        .insert(content)
        .values({
          conceptId: testConceptId,
          title: 'Test Question',
          body: 'This is a test question',
          category: 'road_rules',
          difficulty: 0.5,
          discrimination: 1.2,
          guessParameter: 0.25,
          metadata,
        })
        .returning()

      expect(contentItem).toBeDefined()
      expect(contentItem.conceptId).toBe(testConceptId)
      expect(contentItem.metadata).toEqual(metadata)
      expect(contentItem.difficulty).toBe(0.5)

      testContentId = contentItem.id
    })

    it('should support content versioning for A/B testing', async () => {
      // Create original content
      const [originalContent] = await db
        .insert(content)
        .values({
          conceptId: testConceptId,
          title: 'Original Question',
          body: 'Original question body',
          category: 'road_rules',
          version: 1,
        })
        .returning()

      // Create variant
      const [variantContent] = await db
        .insert(content)
        .values({
          conceptId: testConceptId,
          title: 'Variant Question',
          body: 'Variant question body',
          category: 'road_rules',
          version: 2,
          parentContentId: originalContent.id,
        })
        .returning()

      expect(variantContent.parentContentId).toBe(originalContent.id)
      expect(variantContent.version).toBe(2)
    })
  })

  describe('Knowledge States Table', () => {
    beforeEach(async () => {
      // Create user and concept for knowledge state tests
      const hashedPassword = await bcrypt.hash('testpassword', 10)
      const [user] = await db
        .insert(users)
        .values({
          email: 'knowledge@example.com',
          passwordHash: hashedPassword,
        })
        .returning()
      testUserId = user.id

      const [concept] = await db
        .insert(concepts)
        .values({
          key: 'knowledge-concept',
          name: 'Knowledge Concept',
          category: 'road_rules',
        })
        .returning()
      testConceptId = concept.id
    })

    it('should create knowledge state with BKT parameters', async () => {
      const [knowledgeState] = await db
        .insert(knowledgeStates)
        .values({
          userId: testUserId,
          conceptId: testConceptId,
          initialKnowledge: 0.2,
          learningRate: 0.3,
          guessParameter: 0.25,
          slipParameter: 0.1,
          masteryProbability: 0.4,
          temporalDecay: 0.95,
          personalLearningVelocity: 1.1,
          confidenceLevel: 0.6,
          interactionCount: 5,
          correctCount: 3,
        })
        .returning()

      expect(knowledgeState).toBeDefined()
      expect(knowledgeState.userId).toBe(testUserId)
      expect(knowledgeState.conceptId).toBe(testConceptId)
      expect(knowledgeState.masteryProbability).toBe(0.4)
      expect(knowledgeState.personalLearningVelocity).toBe(1.1)
    })

    it('should enforce unique user-concept constraint', async () => {
      await db.insert(knowledgeStates).values({
        userId: testUserId,
        conceptId: testConceptId,
        initialKnowledge: 0.2,
        learningRate: 0.3,
        guessParameter: 0.25,
        slipParameter: 0.1,
        masteryProbability: 0.4,
      })

      await expect(
        db.insert(knowledgeStates).values({
          userId: testUserId,
          conceptId: testConceptId,
          initialKnowledge: 0.3,
          learningRate: 0.4,
          guessParameter: 0.2,
          slipParameter: 0.15,
          masteryProbability: 0.5,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Learning Events Table', () => {
    beforeEach(async () => {
      // Set up test data
      const hashedPassword = await bcrypt.hash('testpassword', 10)
      const [user] = await db
        .insert(users)
        .values({
          email: 'events@example.com',
          passwordHash: hashedPassword,
        })
        .returning()
      testUserId = user.id

      const [concept] = await db
        .insert(concepts)
        .values({
          key: 'events-concept',
          name: 'Events Concept',
          category: 'road_rules',
        })
        .returning()
      testConceptId = concept.id

      const [contentItem] = await db
        .insert(content)
        .values({
          conceptId: testConceptId,
          title: 'Events Question',
          body: 'Test question for events',
          category: 'road_rules',
        })
        .returning()
      testContentId = contentItem.id
    })

    it('should create learning events with response and context data', async () => {
      const responseData: ResponseData = {
        selectedAnswer: 'A',
        isCorrect: true,
        responseTime: 2500,
        confidenceLevel: 0.8,
        hintsUsed: 0,
        attemptsCount: 1,
      }

      const contextData: ContextData = {
        deviceType: 'mobile',
        sessionId: 'test-session-123',
        timeOfDay: 'morning',
        networkCondition: 'excellent',
        batteryLevel: 85,
        location: {
          country: 'US',
          timezone: 'America/New_York',
        },
      }

      const [learningEvent] = await db
        .insert(learningEvents)
        .values({
          userId: testUserId,
          sessionId: 'test-session-123',
          eventType: 'question_answered',
          conceptId: testConceptId,
          contentId: testContentId,
          responseData,
          contextData,
          sessionPosition: 1,
          cumulativeTime: 2500,
        })
        .returning()

      expect(learningEvent).toBeDefined()
      expect(learningEvent.responseData).toEqual(responseData)
      expect(learningEvent.contextData).toEqual(contextData)
      expect(learningEvent.eventType).toBe('question_answered')
    })
  })

  describe('User Sessions Table', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10)
      const [user] = await db
        .insert(users)
        .values({
          email: 'sessions@example.com',
          passwordHash: hashedPassword,
        })
        .returning()
      testUserId = user.id
    })

    it('should create and track user sessions', async () => {
      const sessionId = 'session-123'
      const startTime = new Date()

      const [session] = await db
        .insert(userSessions)
        .values({
          userId: testUserId,
          sessionId,
          startTime,
          questionsAttempted: 10,
          questionsCorrect: 8,
          xpEarned: 80,
          conceptsStudied: ['concept1', 'concept2'],
          isCompleted: true,
        })
        .returning()

      expect(session).toBeDefined()
      expect(session.sessionId).toBe(sessionId)
      expect(session.questionsAttempted).toBe(10)
      expect(session.questionsCorrect).toBe(8)
      expect(session.conceptsStudied).toEqual(['concept1', 'concept2'])
    })
  })

  describe('Achievements and Gamification', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10)
      const [user] = await db
        .insert(users)
        .values({
          email: 'achievements@example.com',
          passwordHash: hashedPassword,
        })
        .returning()
      testUserId = user.id
    })

    it('should create achievements and track user progress', async () => {
      // Create achievement
      const [achievement] = await db
        .insert(achievements)
        .values({
          key: 'first-correct',
          name: 'First Correct Answer',
          description: 'Answer your first question correctly',
          category: 'milestone',
          xpReward: 10,
          badgeIcon: '🎯',
          requirements: { questionsCorrect: 1 },
        })
        .returning()

      // Track user progress
      const [userAchievement] = await db
        .insert(userAchievements)
        .values({
          userId: testUserId,
          achievementId: achievement.id,
          progress: 0.5,
          isCompleted: false,
        })
        .returning()

      expect(achievement).toBeDefined()
      expect(userAchievement).toBeDefined()
      expect(userAchievement.progress).toBe(0.5)
      expect(userAchievement.isCompleted).toBe(false)
    })
  })

  describe('Spaced Repetition System', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10)
      const [user] = await db
        .insert(users)
        .values({
          email: 'spaced@example.com',
          passwordHash: hashedPassword,
        })
        .returning()
      testUserId = user.id

      const [concept] = await db
        .insert(concepts)
        .values({
          key: 'spaced-concept',
          name: 'Spaced Concept',
          category: 'road_rules',
        })
        .returning()
      testConceptId = concept.id
    })

    it('should create spaced repetition schedules', async () => {
      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + 1) // Tomorrow

      const [spacedRep] = await db
        .insert(spacedRepetition)
        .values({
          userId: testUserId,
          conceptId: testConceptId,
          interval: 1,
          repetition: 1,
          easeFactor: 2.5,
          nextReview,
          quality: 4,
        })
        .returning()

      expect(spacedRep).toBeDefined()
      expect(spacedRep.interval).toBe(1)
      expect(spacedRep.easeFactor).toBe(2.5)
      expect(spacedRep.quality).toBe(4)
    })
  })

  describe('Social Features', () => {
    let user1Id: string
    let user2Id: string

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10)

      const [user1] = await db
        .insert(users)
        .values({
          email: 'user1@example.com',
          passwordHash: hashedPassword,
        })
        .returning()
      user1Id = user1.id

      const [user2] = await db
        .insert(users)
        .values({
          email: 'user2@example.com',
          passwordHash: hashedPassword,
        })
        .returning()
      user2Id = user2.id
    })

    it('should create friendships between users', async () => {
      const [friendship] = await db
        .insert(friendships)
        .values({
          requesterId: user1Id,
          addresseeId: user2Id,
          status: 'pending',
        })
        .returning()

      expect(friendship).toBeDefined()
      expect(friendship.requesterId).toBe(user1Id)
      expect(friendship.addresseeId).toBe(user2Id)
      expect(friendship.status).toBe('pending')
    })
  })

  describe('Notification System', () => {
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10)
      const [user] = await db
        .insert(users)
        .values({
          email: 'notifications@example.com',
          passwordHash: hashedPassword,
        })
        .returning()
      testUserId = user.id
    })

    it('should create and manage notifications', async () => {
      const scheduledFor = new Date()
      scheduledFor.setHours(scheduledFor.getHours() + 1) // 1 hour from now

      const [notification] = await db
        .insert(notifications)
        .values({
          userId: testUserId,
          type: 'reminder',
          title: 'Study Reminder',
          body: 'Time for your daily practice!',
          data: { reminderType: 'daily', conceptId: 'test-concept' },
          scheduledFor,
          deliveryStatus: 'pending',
        })
        .returning()

      expect(notification).toBeDefined()
      expect(notification.type).toBe('reminder')
      expect(notification.title).toBe('Study Reminder')
      expect(notification.deliveryStatus).toBe('pending')
    })
  })

  describe('Database Relationships', () => {
    it('should maintain referential integrity with cascading deletes', async () => {
      // Create user with related data
      const hashedPassword = await bcrypt.hash('testpassword', 10)
      const [user] = await db
        .insert(users)
        .values({
          email: 'cascade@example.com',
          passwordHash: hashedPassword,
        })
        .returning()

      const [concept] = await db
        .insert(concepts)
        .values({
          key: 'cascade-concept',
          name: 'Cascade Concept',
          category: 'road_rules',
        })
        .returning()

      await db.insert(knowledgeStates).values({
        userId: user.id,
        conceptId: concept.id,
        initialKnowledge: 0.2,
        learningRate: 0.3,
        guessParameter: 0.25,
        slipParameter: 0.1,
        masteryProbability: 0.4,
      })

      // Delete user should cascade to knowledge states
      await db.delete(users).where(eq(users.id, user.id))

      const remainingKnowledgeStates = await db
        .select()
        .from(knowledgeStates)
        .where(eq(knowledgeStates.userId, user.id))

      expect(remainingKnowledgeStates).toHaveLength(0)
    })
  })
})
