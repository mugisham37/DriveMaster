import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { Registry } from 'prom-client'
import { DashboardService, DashboardConfig } from '../dashboard-service'
import { WebSocketHandler, WebSocketHandlerConfig } from '../websocket-handler'

// Mock Redis client
const mockRedis = {
  hset: vi.fn(),
  hget: vi.fn(),
  disconnect: vi.fn(),
}

vi.mock('@drivemaster/redis-client', () => ({
  createRedisClient: () => mockRedis,
}))

// Mock Prisma client with performance-focused implementations
const mockPrisma = {
  userBehaviorProfile: {
    findUnique: vi.fn(),
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
  },
  alert: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  report: {
    create: vi.fn(),
  },
} as unknown as PrismaClient

describe('Dashboard Performance Tests', () => {
  let dashboardService: DashboardService
  let webSocketHandler: WebSocketHandler
  let registry: Registry
  let config: DashboardConfig
  let wsConfig: WebSocketHandlerConfig

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

    wsConfig = {
      maxConnections: 1000,
      heartbeatInterval: 30000,
      connectionTimeout: 60000,
    }

    dashboardService = new DashboardService(mockPrisma, config, registry)
    webSocketHandler = new WebSocketHandler(dashboardService, wsConfig)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Dashboard Data Retrieval Performance', () => {
    it('should retrieve user progress data within performance threshold', async () => {
      const userId = 'test-user-123'

      // Mock data for performance test
      mockPrisma.userBehaviorProfile.findUnique.mockResolvedValue({
        avgAccuracy: 0.85,
        studyStreak: 7,
        avgSessionDuration: 25.5,
      })

      mockPrisma.learningEventStream.findMany.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => ({
          createdAt: new Date(Date.now() - i * 60000),
          correct: Math.random() > 0.3,
        })),
      )

      mockPrisma.knowledgeState.findMany.mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => ({
          masteryProbability: Math.random(),
          concept: { name: `Concept ${i}` },
        })),
      )

      const startTime = performance.now()
      const result = await dashboardService.getUserProgressData(userId)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(100) // Should complete within 100ms
      expect(result).toBeDefined()
      expect(result.userId).toBe(userId)
    })

    it('should retrieve system performance data within performance threshold', async () => {
      // Mock large dataset for performance test
      mockPrisma.metricAggregation.findMany.mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => ({
          avg: 100 + Math.random() * 200,
          windowStart: new Date(Date.now() - i * 300000), // 5-minute intervals
        })),
      )

      mockPrisma.learningEventStream.count.mockResolvedValue(5000)

      const startTime = performance.now()
      const result = await dashboardService.getSystemPerformanceData()
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(200) // Should complete within 200ms
      expect(result).toBeDefined()
      expect(result.responseTime).toBeDefined()
      expect(result.throughput).toBeDefined()
    })

    it('should handle concurrent user progress requests efficiently', async () => {
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`)

      // Mock responses for all users
      mockPrisma.userBehaviorProfile.findUnique.mockImplementation((params) =>
        Promise.resolve({
          avgAccuracy: 0.8 + Math.random() * 0.2,
          studyStreak: Math.floor(Math.random() * 30),
          avgSessionDuration: 20 + Math.random() * 20,
        }),
      )

      mockPrisma.learningEventStream.findMany.mockResolvedValue([])
      mockPrisma.knowledgeState.findMany.mockResolvedValue([])

      const startTime = performance.now()

      // Execute concurrent requests
      const promises = userIds.map((userId) => dashboardService.getUserProgressData(userId))

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(500) // All 10 requests should complete within 500ms
      expect(results).toHaveLength(10)
      results.forEach((result, index) => {
        expect(result.userId).toBe(userIds[index])
      })
    })
  })

  describe('WebSocket Performance', () => {
    it('should handle multiple WebSocket connections efficiently', () => {
      const connectionCount = 100
      const connections = Array.from({ length: connectionCount }, () => ({
        socket: {
          readyState: 1,
          send: vi.fn(),
          close: vi.fn(),
          ping: vi.fn(),
          on: vi.fn(),
        },
      }))

      const startTime = performance.now()

      // Add all connections
      connections.forEach((conn, index) => {
        webSocketHandler.addSubscriber('system_performance', conn.socket)
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(50) // Should handle 100 connections within 50ms
      expect(webSocketHandler.getConnectionStats().activeConnections).toBe(connectionCount)
    })

    it('should broadcast updates to many subscribers efficiently', async () => {
      const subscriberCount = 500
      const subscribers = Array.from({ length: subscriberCount }, () => ({
        readyState: 1,
        send: vi.fn(),
      }))

      // Add all subscribers
      subscribers.forEach((subscriber) => {
        dashboardService.addSubscriber('system_performance', subscriber)
      })

      const testData = {
        timestamp: new Date().toISOString(),
        responseTime: { p50: 100, p95: 200, p99: 300 },
        throughput: { requestsPerSecond: 150, eventsPerSecond: 75 },
      }

      const startTime = performance.now()
      await dashboardService['broadcastUpdate']('system_performance', testData)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(100) // Should broadcast to 500 subscribers within 100ms

      // Verify all subscribers received the message
      subscribers.forEach((subscriber) => {
        expect(subscriber.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'dashboard_update',
            dashboardType: 'system_performance',
            timestamp: expect.any(String),
            data: testData,
          }),
        )
      })
    })

    it('should efficiently clean up dead connections during broadcast', async () => {
      const activeCount = 300
      const deadCount = 200

      const activeSubscribers = Array.from({ length: activeCount }, () => ({
        readyState: 1, // WebSocket.OPEN
        send: vi.fn(),
      }))

      const deadSubscribers = Array.from({ length: deadCount }, () => ({
        readyState: 3, // WebSocket.CLOSED
        send: vi.fn(),
      }))

      // Add all subscribers
      const allSubscribers = activeSubscribers.concat(deadSubscribers)
      allSubscribers.forEach((subscriber) => {
        dashboardService.addSubscriber('alerts', subscriber)
      })

      const testData = { alerts: [] }

      const startTime = performance.now()
      await dashboardService['broadcastUpdate']('alerts', testData)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(150) // Should handle cleanup within 150ms

      // Verify only active subscribers received messages
      activeSubscribers.forEach((subscriber) => {
        expect(subscriber.send).toHaveBeenCalled()
      })

      deadSubscribers.forEach((subscriber) => {
        expect(subscriber.send).not.toHaveBeenCalled()
      })
    })
  })

  describe('Memory Usage and Resource Management', () => {
    it('should not leak memory when adding and removing many subscribers', () => {
      const initialMemory = process.memoryUsage().heapUsed
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        const connection = {
          readyState: 1,
          send: vi.fn(),
        }

        // Add subscriber
        dashboardService.addSubscriber('user_progress', connection)

        // Remove subscriber immediately
        dashboardService.removeSubscriber('user_progress', connection)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024)
    })

    it('should handle rapid connection/disconnection cycles efficiently', () => {
      const cycles = 100
      const connectionsPerCycle = 10

      const startTime = performance.now()

      for (let cycle = 0; cycle < cycles; cycle++) {
        const connections = Array.from({ length: connectionsPerCycle }, () => ({
          readyState: 1,
          send: vi.fn(),
        }))

        // Add all connections
        connections.forEach((conn) => {
          webSocketHandler.addSubscriber('business_kpis', conn)
        })

        // Remove all connections
        connections.forEach((conn) => {
          webSocketHandler.removeSubscriber('business_kpis', conn)
        })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // 1000 cycles should complete within 1 second
      expect(webSocketHandler.getConnectionStats().activeConnections).toBe(0)
    })
  })

  describe('Database Query Performance', () => {
    it('should efficiently query large datasets for business KPIs', async () => {
      // Mock large dataset responses
      mockPrisma.learningEventStream.groupBy.mockImplementation(() =>
        Promise.resolve(Array.from({ length: 10000 }, (_, i) => ({ userId: `user-${i}` }))),
      )

      mockPrisma.metricAggregation.findMany.mockImplementation(() =>
        Promise.resolve(
          Array.from({ length: 5000 }, (_, i) => ({
            avg: Math.random() * 100,
            windowStart: new Date(Date.now() - i * 60000),
          })),
        ),
      )

      const startTime = performance.now()
      const result = await dashboardService.getBusinessKPIData()
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(300) // Should handle large datasets within 300ms
      expect(result).toBeDefined()
      expect(result.activeUsers).toBeDefined()
    })

    it('should handle concurrent database queries without performance degradation', async () => {
      const concurrentQueries = 20

      // Mock database responses
      mockPrisma.metricAggregation.findMany.mockResolvedValue([
        { avg: 150, windowStart: new Date() },
      ])
      mockPrisma.learningEventStream.count.mockResolvedValue(1000)

      const startTime = performance.now()

      const promises = Array.from({ length: concurrentQueries }, () =>
        dashboardService.getSystemPerformanceData(),
      )

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000) // 20 concurrent queries within 1 second
      expect(results).toHaveLength(concurrentQueries)
      results.forEach((result) => {
        expect(result).toBeDefined()
        expect(result.responseTime).toBeDefined()
      })
    })
  })

  describe('Alert System Performance', () => {
    it('should process threshold checks efficiently', async () => {
      // Mock system performance data
      vi.spyOn(dashboardService, 'getSystemPerformanceData').mockResolvedValue({
        timestamp: new Date().toISOString(),
        responseTime: { p50: 100, p95: 250, p99: 300 }, // Exceeds threshold
        throughput: { requestsPerSecond: 100, eventsPerSecond: 50 },
        errorRate: 0.02, // Exceeds threshold
        activeConnections: 150,
        systemLoad: { cpu: 85, memory: 70, disk: 50 }, // CPU exceeds threshold
        serviceHealth: {
          'user-service': 'healthy',
          'content-service': 'healthy',
          'adaptive-service': 'healthy',
          'engagement-service': 'healthy',
          'analytics-service': 'healthy',
        },
      })

      const startTime = performance.now()
      await dashboardService.checkThresholds()
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(50) // Threshold checking should be very fast

      // Verify alerts were created for threshold breaches
      expect(mockPrisma.alert.create).toHaveBeenCalledTimes(3) // Response time, error rate, and system load
    })

    it('should handle anomaly detection on large datasets efficiently', async () => {
      const startTime = new Date(Date.now() - 60 * 60 * 1000)
      const endTime = new Date()

      const performanceStartTime = performance.now()
      const anomalies = await dashboardService.detectAnomalies(startTime, endTime)
      const performanceEndTime = performance.now()
      const duration = performanceEndTime - performanceStartTime

      expect(duration).toBeLessThan(100) // Anomaly detection should complete within 100ms
      expect(Array.isArray(anomalies)).toBe(true)
    })
  })

  describe('Stress Testing', () => {
    it('should maintain performance under high load', async () => {
      const highLoadOperations = 50
      const operations = []

      // Mix of different operations to simulate real load
      for (let i = 0; i < highLoadOperations; i++) {
        if (i % 4 === 0) {
          operations.push(dashboardService.getUserProgressData(`user-${i}`))
        } else if (i % 4 === 1) {
          operations.push(dashboardService.getSystemPerformanceData())
        } else if (i % 4 === 2) {
          operations.push(dashboardService.getBusinessKPIData())
        } else {
          operations.push(dashboardService.getAlertsData())
        }
      }

      // Mock all database calls to return quickly
      mockPrisma.userBehaviorProfile.findUnique.mockResolvedValue({ avgAccuracy: 0.8 })
      mockPrisma.learningEventStream.findMany.mockResolvedValue([])
      mockPrisma.learningEventStream.count.mockResolvedValue(100)
      mockPrisma.learningEventStream.groupBy.mockResolvedValue([])
      mockPrisma.knowledgeState.findMany.mockResolvedValue([])
      mockPrisma.metricAggregation.findMany.mockResolvedValue([{ avg: 150 }])
      mockPrisma.alert.findMany.mockResolvedValue([])

      const startTime = performance.now()
      const results = await Promise.all(operations)
      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(2000) // All operations should complete within 2 seconds
      expect(results).toHaveLength(highLoadOperations)
      results.forEach((result) => {
        expect(result).toBeDefined()
      })
    })
  })
})
