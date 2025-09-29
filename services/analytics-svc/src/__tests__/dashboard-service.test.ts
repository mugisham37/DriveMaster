import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { Registry } from 'prom-client'
import { DashboardService, DashboardConfig } from '../dashboard-service'

// Mock Redis client
const mockRedis = {
  hset: vi.fn(),
  hget: vi.fn(),
  disconnect: vi.fn(),
}

vi.mock('@drivemaster/redis-client', () => ({
  createRedisClient: () => mockRedis,
}))

// Mock Prisma client
const mockPrisma = {
  userBehaviorProfile: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  learningEventStream: {
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  knowledgeState: {
    findMany: vi.fn(),
  },
  metricAggregation: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    findUnique: vi.fn(),
  },
  alert: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  report: {
    create: vi.fn(),
  },
  user: {
    count: vi.fn(),
  },
} as unknown as PrismaClient

describe('DashboardService', () => {
  let dashboardService: DashboardService
  let registry: Registry
  let config: DashboardConfig

  beforeEach(() => {
    registry = new Registry()
    config = {
      redisUrl: 'redis://localhost:6379',
      refreshIntervalMs: 30000,
      alertThresholds: {
        responseTime: 200,
        errorRate: 0.01,
        activeUsers: 100,
        systemLoad: 80,
      },
      reportingSchedule: {
        hourly: '0 * * * *',
        daily: '0 6 * * *',
        weekly: '0 6 * * 1',
        monthly: '0 6 1 * *',
      },
    }

    dashboardService = new DashboardService(mockPrisma, config, registry)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('getUserProgressData', () => {
    it('should return user progress data with correct structure', async () => {
      const userId = 'test-user-123'
      const mockProfile = {
        avgAccuracy: 0.85,
        studyStreak: 7,
        avgSessionDuration: 25.5,
      }
      const mockEvents = [
        {
          createdAt: new Date(),
          correct: true,
        },
        {
          createdAt: new Date(),
          correct: false,
        },
      ]
      const mockKnowledgeStates = [
        { masteryProbability: 0.9, concept: { name: 'Traffic Signs' } },
        { masteryProbability: 0.7, concept: { name: 'Road Rules' } },
        { masteryProbability: 0.6, concept: { name: 'Safety' } },
      ]

      mockPrisma.userBehaviorProfile.findUnique.mockResolvedValue(mockProfile)
      mockPrisma.learningEventStream.findMany.mockResolvedValue(mockEvents)
      mockPrisma.knowledgeState.findMany.mockResolvedValue(mockKnowledgeStates)

      const result = await dashboardService.getUserProgressData(userId)

      expect(result).toEqual({
        userId,
        currentAccuracy: 0.85,
        masteryProgress: 1 / 3, // 1 concept with mastery > 0.8 out of 3 total
        streakCount: 7,
        sessionDuration: 25.5,
        conceptsCompleted: 1,
        totalConcepts: 3,
        recentActivity: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(String),
            value: expect.any(Number),
            type: 'accuracy',
          }),
        ]),
      })

      expect(mockPrisma.userBehaviorProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      })
      expect(mockPrisma.knowledgeState.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { concept: true },
      })
    })

    it('should handle missing user profile gracefully', async () => {
      const userId = 'test-user-123'

      mockPrisma.userBehaviorProfile.findUnique.mockResolvedValue(null)
      mockPrisma.learningEventStream.findMany.mockResolvedValue([])
      mockPrisma.knowledgeState.findMany.mockResolvedValue([])

      const result = await dashboardService.getUserProgressData(userId)

      expect(result).toEqual({
        userId,
        currentAccuracy: 0,
        masteryProgress: 0,
        streakCount: 0,
        sessionDuration: 0,
        conceptsCompleted: 0,
        totalConcepts: 0,
        recentActivity: [],
      })
    })
  })

  describe('getSystemPerformanceData', () => {
    it('should return system performance data with correct metrics', async () => {
      const mockResponseTimeMetrics = [{ avg: 150 }, { avg: 200 }, { avg: 100 }, { avg: 250 }]

      mockPrisma.metricAggregation.findMany.mockResolvedValue(mockResponseTimeMetrics)
      mockPrisma.learningEventStream.count.mockResolvedValue(300)

      const result = await dashboardService.getSystemPerformanceData()

      expect(result).toEqual({
        timestamp: expect.any(String),
        responseTime: {
          p50: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number),
        },
        throughput: {
          requestsPerSecond: expect.any(Number),
          eventsPerSecond: expect.any(Number),
        },
        errorRate: expect.any(Number),
        activeConnections: expect.any(Number),
        systemLoad: {
          cpu: expect.any(Number),
          memory: expect.any(Number),
          disk: expect.any(Number),
        },
        serviceHealth: expect.objectContaining({
          'user-service': expect.stringMatching(/healthy|degraded|unhealthy/),
          'content-service': expect.stringMatching(/healthy|degraded|unhealthy/),
          'adaptive-service': expect.stringMatching(/healthy|degraded|unhealthy/),
          'engagement-service': expect.stringMatching(/healthy|degraded|unhealthy/),
          'analytics-service': expect.stringMatching(/healthy|degraded|unhealthy/),
        }),
      })
    })
  })

  describe('getBusinessKPIData', () => {
    it('should return business KPI data with correct structure', async () => {
      mockPrisma.learningEventStream.groupBy.mockResolvedValue([
        { userId: 'user1', _avg: { responseTime: 25 } },
        { userId: 'user2', _avg: { responseTime: 30 } },
        { userId: 'user3', _avg: { responseTime: 20 } },
      ])

      const result = await dashboardService.getBusinessKPIData()

      expect(result).toEqual({
        timestamp: expect.any(String),
        activeUsers: {
          current: expect.any(Number),
          daily: expect.any(Number),
          weekly: expect.any(Number),
          monthly: expect.any(Number),
        },
        engagement: {
          averageSessionDuration: expect.any(Number),
          dailyActiveUsers: expect.any(Number),
          retentionRate: expect.any(Number),
          completionRate: expect.any(Number),
        },
        learning: {
          averageAccuracy: expect.any(Number),
          conceptsMastered: expect.any(Number),
          totalLearningTime: expect.any(Number),
          dropoutRate: expect.any(Number),
        },
        revenue: {
          mrr: expect.any(Number),
          churn: expect.any(Number),
          ltv: expect.any(Number),
        },
      })
    })
  })

  describe('getAlertsData', () => {
    it('should return active alerts with correct format', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          alertType: 'response_time_breach',
          severity: 'HIGH',
          title: 'High Response Time',
          description: 'Response time exceeded threshold',
          createdAt: new Date(),
          status: 'ACTIVE',
          entityType: 'system',
          entityId: 'analytics-service',
          actualValue: 250,
          threshold: 200,
        },
        {
          id: 'alert-2',
          alertType: 'low_engagement',
          severity: 'MEDIUM',
          title: 'Low User Engagement',
          description: 'User engagement below threshold',
          createdAt: new Date(),
          status: 'ACTIVE',
          entityType: 'user',
          entityId: 'user-123',
          actualValue: 0.3,
          threshold: 0.5,
        },
      ]

      mockPrisma.alert.findMany.mockResolvedValue(mockAlerts)

      const result = await dashboardService.getAlertsData()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'alert-1',
        type: 'response_time_breach',
        severity: 'HIGH',
        title: 'High Response Time',
        description: 'Response time exceeded threshold',
        timestamp: expect.any(String),
        status: 'ACTIVE',
        entityType: 'system',
        entityId: 'analytics-service',
        actualValue: 250,
        threshold: 200,
        trend: expect.stringMatching(/increasing|decreasing|stable/),
      })
    })
  })

  describe('subscriber management', () => {
    it('should add and remove subscribers correctly', () => {
      const mockConnection = { readyState: 1, send: vi.fn() }
      const dashboardType = 'user_progress'

      // Add subscriber
      dashboardService.addSubscriber(dashboardType, mockConnection)

      // Verify subscriber was added
      expect(dashboardService['subscribers'].get(dashboardType)?.has(mockConnection)).toBe(true)

      // Remove subscriber
      dashboardService.removeSubscriber(dashboardType, mockConnection)

      // Verify subscriber was removed (set should be empty or undefined)
      const subscriberSet = dashboardService['subscribers'].get(dashboardType)
      expect(subscriberSet?.has(mockConnection) || false).toBe(false)
    })

    it('should broadcast updates to all subscribers', async () => {
      const mockConnection1 = { readyState: 1, send: vi.fn() }
      const mockConnection2 = { readyState: 1, send: vi.fn() }
      const dashboardType = 'system_performance'
      const testData = { test: 'data' }

      // Add subscribers
      dashboardService.addSubscriber(dashboardType, mockConnection1)
      dashboardService.addSubscriber(dashboardType, mockConnection2)

      // Broadcast update
      await dashboardService['broadcastUpdate'](dashboardType, testData)

      // Verify both connections received the update
      expect(mockConnection1.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"dashboard_update"'),
      )
      expect(mockConnection2.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"dashboard_update"'),
      )
    })

    it('should clean up dead connections during broadcast', async () => {
      const mockConnection1 = { readyState: 1, send: vi.fn() }
      const mockConnection2 = { readyState: 3, send: vi.fn() } // CLOSED state
      const dashboardType = 'alerts'
      const testData = { test: 'data' }

      // Add subscribers
      dashboardService.addSubscriber(dashboardType, mockConnection1)
      dashboardService.addSubscriber(dashboardType, mockConnection2)

      // Broadcast update
      await dashboardService['broadcastUpdate'](dashboardType, testData)

      // Verify only active connection received the update
      expect(mockConnection1.send).toHaveBeenCalled()
      expect(mockConnection2.send).not.toHaveBeenCalled()

      // Verify dead connection was removed
      expect(dashboardService['subscribers'].get(dashboardType)?.has(mockConnection2)).toBe(false)
    })
  })

  describe('alert threshold checking', () => {
    it('should create alert when response time threshold is breached', async () => {
      // Mock system performance data with high response time
      vi.spyOn(dashboardService, 'getSystemPerformanceData').mockResolvedValue({
        timestamp: new Date().toISOString(),
        responseTime: { p50: 150, p95: 250, p99: 300 }, // p95 exceeds threshold of 200
        throughput: { requestsPerSecond: 100, eventsPerSecond: 50 },
        errorRate: 0.005,
        activeConnections: 150,
        systemLoad: { cpu: 60, memory: 70, disk: 50 },
        serviceHealth: {
          'user-service': 'healthy',
          'content-service': 'healthy',
          'adaptive-service': 'healthy',
          'engagement-service': 'healthy',
          'analytics-service': 'healthy',
        },
      })

      await dashboardService.checkThresholds()

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'response_time_breach',
          severity: 'HIGH',
          title: 'High Response Time Detected',
          actualValue: 250,
          threshold: 200,
        }),
      })
    })

    it('should create alert when error rate threshold is breached', async () => {
      // Mock system performance data with high error rate
      vi.spyOn(dashboardService, 'getSystemPerformanceData').mockResolvedValue({
        timestamp: new Date().toISOString(),
        responseTime: { p50: 100, p95: 150, p99: 200 },
        throughput: { requestsPerSecond: 100, eventsPerSecond: 50 },
        errorRate: 0.02, // Exceeds threshold of 0.01
        activeConnections: 150,
        systemLoad: { cpu: 60, memory: 70, disk: 50 },
        serviceHealth: {
          'user-service': 'healthy',
          'content-service': 'healthy',
          'adaptive-service': 'healthy',
          'engagement-service': 'healthy',
          'analytics-service': 'healthy',
        },
      })

      await dashboardService.checkThresholds()

      expect(mockPrisma.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'error_rate_breach',
          severity: 'CRITICAL',
          title: 'High Error Rate Detected',
          actualValue: 0.02,
          threshold: 0.01,
        }),
      })
    })
  })

  describe('anomaly detection', () => {
    it('should detect response time anomalies', async () => {
      const startTime = new Date(Date.now() - 60 * 60 * 1000)
      const endTime = new Date()

      // Mock random to always return anomaly
      vi.spyOn(Math, 'random').mockReturnValue(0.05) // Less than 0.1 threshold

      const anomalies = await dashboardService.detectAnomalies(startTime, endTime)

      expect(anomalies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'response_time_anomaly',
            severity: 'MEDIUM',
            description: 'Response time spike detected',
          }),
        ]),
      )
    })

    it('should detect error rate anomalies', async () => {
      const startTime = new Date(Date.now() - 60 * 60 * 1000)
      const endTime = new Date()

      // Mock random to return error rate anomaly
      vi.spyOn(Math, 'random').mockReturnValue(0.02) // Less than 0.05 threshold

      const anomalies = await dashboardService.detectAnomalies(startTime, endTime)

      expect(anomalies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'error_rate_anomaly',
            severity: 'HIGH',
            description: 'Error rate spike detected',
          }),
        ]),
      )
    })
  })
})
