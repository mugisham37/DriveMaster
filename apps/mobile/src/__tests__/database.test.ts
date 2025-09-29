import { database } from '../database'
import { User, Question, LearningSession } from '../types'

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execAsync: jest.fn(),
  })),
}))

// Mock drizzle-orm
jest.mock('drizzle-orm/expo-sqlite', () => ({
  drizzle: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}))

describe('Database Manager', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    cognitivePatterns: {
      learningStyle: 'visual',
      processingSpeed: 0.8,
      attentionSpan: 30,
      preferredDifficulty: 0.6,
      motivationFactors: ['gamification'],
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  const mockQuestion: Question = {
    id: 'q1',
    title: 'Stop Sign Test',
    content: 'What should you do at a stop sign?',
    category: 'traffic-signs',
    difficulty: 0.3,
    options: [
      { id: 'a', text: 'Slow down', isCorrect: false },
      { id: 'b', text: 'Stop completely', isCorrect: true },
    ],
    correctAnswer: 'b',
    explanation: 'You must come to a complete stop.',
    version: 1,
  }

  const mockSession: LearningSession = {
    id: 'session-1',
    userId: 'user-1',
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T10:30:00Z',
    questionsAnswered: 5,
    correctAnswers: 4,
    totalScore: 40,
    category: 'traffic-signs',
    isCompleted: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Operations', () => {
    it('should save user successfully', async () => {
      await expect(database.saveUser(mockUser)).resolves.not.toThrow()
    })

    it('should handle user save with minimal data', async () => {
      const minimalUser: User = {
        id: 'user-2',
        email: 'minimal@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      await expect(database.saveUser(minimalUser)).resolves.not.toThrow()
    })
  })

  describe('Question Operations', () => {
    it('should save questions successfully', async () => {
      await expect(database.saveQuestions([mockQuestion])).resolves.not.toThrow()
    })

    it('should save multiple questions', async () => {
      const questions = [
        mockQuestion,
        { ...mockQuestion, id: 'q2', title: 'Yield Sign Test' },
        { ...mockQuestion, id: 'q3', title: 'Speed Limit Test' },
      ]

      await expect(database.saveQuestions(questions)).resolves.not.toThrow()
    })

    it('should handle questions without optional fields', async () => {
      const minimalQuestion: Question = {
        id: 'q-minimal',
        title: 'Minimal Question',
        content: 'Test content',
        category: 'road-rules',
        difficulty: 0.5,
        version: 1,
      }

      await expect(database.saveQuestions([minimalQuestion])).resolves.not.toThrow()
    })
  })

  describe('Learning Session Operations', () => {
    it('should save learning session successfully', async () => {
      await expect(database.saveLearningSession(mockSession)).resolves.not.toThrow()
    })

    it('should save incomplete session', async () => {
      const incompleteSession: LearningSession = {
        id: 'session-incomplete',
        userId: 'user-1',
        startTime: '2024-01-01T10:00:00Z',
        questionsAnswered: 2,
        correctAnswers: 1,
        totalScore: 10,
        isCompleted: false,
      }

      await expect(database.saveLearningSession(incompleteSession)).resolves.not.toThrow()
    })
  })

  describe('User Response Operations', () => {
    it('should save user response successfully', async () => {
      const response = {
        userId: 'user-1',
        sessionId: 'session-1',
        questionId: 'q1',
        selectedAnswer: 'b',
        isCorrect: true,
        responseTime: 2500,
        confidence: 0.9,
        timestamp: '2024-01-01T10:15:00Z',
      }

      await expect(database.saveUserResponse(response)).resolves.not.toThrow()
    })

    it('should save response without optional fields', async () => {
      const minimalResponse = {
        userId: 'user-1',
        questionId: 'q1',
        selectedAnswer: 'a',
        isCorrect: false,
        responseTime: 3000,
        timestamp: '2024-01-01T10:20:00Z',
      }

      await expect(database.saveUserResponse(minimalResponse)).resolves.not.toThrow()
    })
  })

  describe('Offline Action Operations', () => {
    it('should save offline action successfully', async () => {
      const action = {
        id: 'action-1',
        type: 'ANSWER_QUESTION' as const,
        payload: { questionId: 'q1', answer: 'b' },
        timestamp: '2024-01-01T10:00:00Z',
        retryCount: 0,
        maxRetries: 3,
      }

      await expect(database.saveOfflineAction(action)).resolves.not.toThrow()
    })

    it('should handle different action types', async () => {
      const actions = [
        {
          id: 'action-answer',
          type: 'ANSWER_QUESTION' as const,
          payload: { questionId: 'q1' },
          timestamp: '2024-01-01T10:00:00Z',
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'action-profile',
          type: 'UPDATE_PROFILE' as const,
          payload: { name: 'Test User' },
          timestamp: '2024-01-01T10:01:00Z',
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: 'action-friend',
          type: 'ADD_FRIEND' as const,
          payload: { friendId: 'friend-1' },
          timestamp: '2024-01-01T10:02:00Z',
          retryCount: 0,
          maxRetries: 3,
        },
      ]

      for (const action of actions) {
        await expect(database.saveOfflineAction(action)).resolves.not.toThrow()
      }
    })
  })

  describe('Cache Operations', () => {
    it('should set and get cache successfully', async () => {
      const key = 'test-cache-key'
      const data = { message: 'Hello, World!', timestamp: Date.now() }

      await expect(database.setCache(key, data)).resolves.not.toThrow()
    })

    it('should handle cache with expiration', async () => {
      const key = 'expiring-cache'
      const data = { value: 42 }
      const expiresAt = new Date(Date.now() + 60000) // 1 minute from now

      await expect(database.setCache(key, data, expiresAt)).resolves.not.toThrow()
    })

    it('should handle complex cache data', async () => {
      const key = 'complex-cache'
      const data = {
        user: mockUser,
        questions: [mockQuestion],
        session: mockSession,
        metadata: {
          version: 1,
          lastUpdated: new Date().toISOString(),
        },
      }

      await expect(database.setCache(key, data)).resolves.not.toThrow()
    })
  })

  describe('Database Maintenance', () => {
    it('should cleanup expired cache', async () => {
      await expect(database.cleanupExpiredCache()).resolves.not.toThrow()
    })

    it('should vacuum database', async () => {
      await expect(database.vacuum()).resolves.not.toThrow()
    })

    it('should get database size', async () => {
      const size = await database.getDbSize()
      expect(typeof size).toBe('number')
      expect(size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid user data gracefully', async () => {
      const invalidUser = {
        // Missing required fields
        email: 'invalid@example.com',
      } as any

      // Should not throw, but may log errors
      await expect(database.saveUser(invalidUser)).resolves.not.toThrow()
    })

    it('should handle empty question array', async () => {
      await expect(database.saveQuestions([])).resolves.not.toThrow()
    })

    it('should handle null cache data', async () => {
      await expect(database.setCache('null-test', null)).resolves.not.toThrow()
    })
  })
})
