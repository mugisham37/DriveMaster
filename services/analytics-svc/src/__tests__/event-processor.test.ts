import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AnalyticsEventProcessor } from '../event-processor'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

// Mock dependencies
vi.mock('@drivemaster/kafka-client', () => ({
  KafkaEventProcessor: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    createConsumer: vi.fn(),
    registerSchema: vi.fn(),
    registerHandler: vi.fn(),
    startProcessing: vi.fn(),
    createTopics: vi.fn(),
    publishEvent: vi.fn(),
    disconnect: vi.fn(),
    enableEventReplay: vi.fn(),
  })),
  EventAggregator: vi.fn().mockImplementation(() => ({
    createWindow: vi.fn(),
    addEvent: vi.fn(),
  })),
}))

vi.mock('@drivemaster/redis-client', () => ({
  createRedisClient: vi.fn(() => ({
    hset: vi.fn(),
    expire: vi.fn(),
    hincrby: vi.fn(),
  })),
}))

vi.mock('@prisma/client')

describe('AnalyticsEventProcessor', () => {
  let processor: AnalyticsEventProcessor
  let mockPrisma: any
  let config: any

  beforeEach(() => {
    config = {
      kafkaBrokers: ['localhost:9092'],
      redisUrl: 'redis://localhost:6379',
      groupId: 'test-analytics-group',
      batchSize: 100,
      windowSizeMs: 60000,
    }

    mockPrisma = {
      learningEventStream: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      metricAggregation: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      alert: {
        create: vi.fn(),
      },
    }

    processor = new AnalyticsEventProcessor(config, mockPrisma as PrismaClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Event Processing', () => {
    it('should process learning events correctly', async () => {
      const learningEvent = {
        eventId: randomUUID(),
        userId: 'user-123',
        sessionId: 'session-456',
        conceptKey: 'traffic-signs',
        eventType: 'question_answered',
        correct: true,
        responseTime: 5000,
        confidence: 4,
        attempts: 1,
        timestamp: Date.now(),
        version: '1.0',
        rawEventData: {},
      }

      const mockPayload = {
        topic: 'learning.events.v1',
        partition: 0,
        message: {
          key: Buffer.from(learningEvent.eventId),
          value: Buffer.from(JSON.stringify(learningEvent)),
          timestamp: Date.now().toString(),
          offset: '123',
        },
      }

      mockPrisma.learningEventStream.create.mockResolvedValue({})

      // Test the private method through reflection
      await (processor as any).handleLearningEvent(mockPayload)

      expect(mockPrisma.learningEventStream.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: learningEvent.eventId,
          userId: learningEvent.userId,
          conceptKey: learningEvent.conceptKey,
          correct: learningEvent.correct,
          responseTime: learningEvent.responseTime,
        }),
      })
    })

    it('should validate event schemas', async () => {
      const invalidEvent = {
        eventId: randomUUID(),
        // Missing required fields
        timestamp: Date.now(),
      }

      const mockPayload = {
        topic: 'learning.events.v1',
        partition: 0,
        message: {
          key: Buffer.from('test'),
          value: Buffer.from(JSON.stringify(invalidEvent)),
          timestamp: Date.now().toString(),
          offset: '123',
        },
      }

      await expect((processor as any).handleLearningEvent(mockPayload)).rejects.toThrow(
        'Schema validation failed',
      )
    })

    it('should create alerts for performance anomalies', async () => {
      const anomalousEvent = {
        eventId: randomUUID(),
        userId: 'user-123',
        conceptKey: 'traffic-signs',
        eventType: 'question_answered',
        correct: false,
        responseTime: 75000, // Very slow response
        timestamp: Date.now(),
        version: '1.0',
        rawEventData: {},
      }

      mockPrisma.learningEventStream.create.mockResolvedValue({})
      mockPrisma.alert.create.mockResolvedValue({})

      await (processor as any).checkLearningAnomalies(anomalousEvent)

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          alertType: 'performance_anomaly',
          severity: 'MEDIUM',
          entityType: 'user',
          entityId: 'user-123',
        }),
      })
    })

    it('should aggregate metrics correctly', async () => {
      const events = [
        {
          userId: 'user-123',
          conceptKey: 'traffic-signs',
          correct: true,
          responseTime: 3000,
          windowTimestamp: Date.now(),
        },
        {
          userId: 'user-123',
          conceptKey: 'traffic-signs',
          correct: false,
          responseTime: 5000,
          windowTimestamp: Date.now(),
        },
      ]

      mockPrisma.metricAggregation.upsert.mockResolvedValue({})
      mockPrisma.metricAggregation.findUnique.mockResolvedValue(null)

      await (processor as any).processRealtimeWindow(events, '1m')

      expect(mockPrisma.metricAggregation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            metricName_timeWindow_windowStart_userId_conceptKey_categoryKey:
              expect.objectContaining({
                metricName: 'accuracy_rate',
                userId: 'user-123',
                conceptKey: 'traffic-signs',
              }),
          }),
          create: expect.objectContaining({
            value: 0.5, // 1 correct out of 2 total
            count: 2,
          }),
        }),
      )
    })
  })

  describe('Event Aggregation', () => {
    it('should group events by user and concept correctly', () => {
      const events = [
        { userId: 'user-1', conceptKey: 'concept-a' },
        { userId: 'user-1', conceptKey: 'concept-b' },
        { userId: 'user-2', conceptKey: 'concept-a' },
        { userId: 'user-1', conceptKey: 'concept-a' },
      ]

      const groups = (processor as any).groupEventsByUserConcept(events)

      expect(groups.size).toBe(3)
      expect(groups.get('user-1|concept-a')).toHaveLength(2)
      expect(groups.get('user-1|concept-b')).toHaveLength(1)
      expect(groups.get('user-2|concept-a')).toHaveLength(1)
    })

    it('should calculate accuracy metrics correctly', async () => {
      const events = [
        { correct: true, responseTime: 2000 },
        { correct: false, responseTime: 3000 },
        { correct: true, responseTime: 1500 },
        { correct: null, responseTime: 4000 }, // Not counted in accuracy
      ]

      const data = {
        metricName: 'accuracy_rate',
        metricType: 'GAUGE',
        aggregation: 'AVERAGE',
        timeWindow: '1m',
        windowStart: new Date(),
        windowEnd: new Date(),
        userId: 'user-123',
        conceptKey: 'traffic-signs',
        events,
      }

      mockPrisma.metricAggregation.upsert.mockResolvedValue({})
      mockPrisma.metricAggregation.findUnique.mockResolvedValue(null)

      await (processor as any).updateMetricAggregation(data)

      expect(mockPrisma.metricAggregation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            value: 2 / 3, // 2 correct out of 3 answered questions
            count: 3,
          }),
        }),
      )
    })

    it('should calculate response time metrics correctly', async () => {
      const events = [
        { responseTime: 2000 },
        { responseTime: 3000 },
        { responseTime: 1000 },
        { responseTime: null }, // Not counted
      ]

      const data = {
        metricName: 'response_time',
        metricType: 'HISTOGRAM',
        aggregation: 'AVERAGE',
        timeWindow: '1m',
        windowStart: new Date(),
        windowEnd: new Date(),
        userId: 'user-123',
        conceptKey: 'traffic-signs',
        events,
      }

      mockPrisma.metricAggregation.upsert.mockResolvedValue({})
      mockPrisma.metricAggregation.findUnique.mockResolvedValue(null)

      await (processor as any).updateMetricAggregation(data)

      expect(mockPrisma.metricAggregation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            value: 2000, // Average of 2000, 3000, 1000
            count: 3,
          }),
        }),
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const learningEvent = {
        eventId: randomUUID(),
        userId: 'user-123',
        conceptKey: 'traffic-signs',
        eventType: 'question_answered',
        timestamp: Date.now(),
        version: '1.0',
        rawEventData: {},
      }

      const mockPayload = {
        topic: 'learning.events.v1',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(learningEvent)),
          offset: '123',
        },
      }

      mockPrisma.learningEventStream.create.mockRejectedValue(new Error('Database error'))

      await expect((processor as any).handleLearningEvent(mockPayload)).rejects.toThrow(
        'Database error',
      )
    })

    it('should handle malformed JSON gracefully', async () => {
      const mockPayload = {
        topic: 'learning.events.v1',
        partition: 0,
        message: {
          value: Buffer.from('invalid json'),
          offset: '123',
        },
      }

      await expect((processor as any).handleLearningEvent(mockPayload)).rejects.toThrow()
    })
  })

  describe('Real-time Processing', () => {
    it('should update Redis with real-time metrics', async () => {
      const event = {
        userId: 'user-123',
        correct: true,
        responseTime: 3000,
        engagementScore: 0.8,
        conceptKey: 'traffic-signs',
      }

      // Mock Redis client
      const mockRedis = {
        hset: vi.fn(),
        expire: vi.fn(),
        hincrby: vi.fn(),
      }

      ;(processor as any).redis = mockRedis

      await (processor as any).processLearningEventRealtime(event)

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'user:user-123:realtime',
        expect.objectContaining({
          lastAccuracy: 1,
          lastResponseTime: 3000,
          lastEngagement: 0.8,
        }),
      )

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'concept:traffic-signs:realtime',
        'totalAttempts',
        1,
      )

      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'concept:traffic-signs:realtime',
        'correctAttempts',
        1,
      )
    })
  })

  describe('Performance', () => {
    it('should process events within acceptable time limits', async () => {
      const startTime = Date.now()

      const learningEvent = {
        eventId: randomUUID(),
        userId: 'user-123',
        conceptKey: 'traffic-signs',
        eventType: 'question_answered',
        correct: true,
        responseTime: 3000,
        timestamp: Date.now(),
        version: '1.0',
        rawEventData: {},
      }

      const mockPayload = {
        topic: 'learning.events.v1',
        partition: 0,
        message: {
          value: Buffer.from(JSON.stringify(learningEvent)),
          offset: '123',
        },
      }

      mockPrisma.learningEventStream.create.mockResolvedValue({})
      ;(processor as any).redis = {
        hset: vi.fn(),
        expire: vi.fn(),
        hincrby: vi.fn(),
      }

      await (processor as any).handleLearningEvent(mockPayload)

      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(100) // Should process within 100ms
    })

    it('should handle high-volume event processing', async () => {
      const eventCount = 1000
      const events = Array.from({ length: eventCount }, (_, i) => ({
        eventId: randomUUID(),
        userId: `user-${i % 10}`, // 10 different users
        conceptKey: `concept-${i % 5}`, // 5 different concepts
        eventType: 'question_answered',
        correct: Math.random() > 0.5,
        responseTime: Math.floor(Math.random() * 10000) + 1000,
        timestamp: Date.now(),
        version: '1.0',
        rawEventData: {},
      }))

      mockPrisma.metricAggregation.upsert.mockResolvedValue({})
      mockPrisma.metricAggregation.findUnique.mockResolvedValue(null)

      const startTime = Date.now()

      // Simulate processing a large batch
      const windowEvents = events.map((e) => ({ ...e, windowTimestamp: Date.now() }))
      await (processor as any).processRealtimeWindow(windowEvents, '1m')

      const processingTime = Date.now() - startTime
      expect(processingTime).toBeLessThan(5000) // Should process 1000 events within 5 seconds
    })
  })
})
