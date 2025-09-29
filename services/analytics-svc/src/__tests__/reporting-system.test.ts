import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { Registry } from 'prom-client'
import { ReportingSystem, ReportingConfig } from '../reporting-system'

// Mock Redis client
const mockRedis = {
  hset: vi.fn(),
  hget: vi.fn(),
  disconnect: vi.fn(),
}

vi.mock('@drivemaster/redis-client', () => ({
  createRedisClient: () => mockRedis,
}))

// Mock node-cron
vi.mock('node-cron', () => ({
  schedule: vi.fn(),
}))

// Mock Prisma client
const mockPrisma = {
  metricAggregation: {
    findMany: vi.fn(),
  },
  learningEventStream: {
    count: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  alert: {
    findMany: vi.fn(),
  },
  user: {
    count: vi.fn(),
  },
  report: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
} as unknown as PrismaClient

describe('ReportingSystem', () => {
  let reportingSystem: ReportingSystem
  let registry: Registry
  let config: ReportingConfig

  beforeEach(() => {
    registry = new Registry()
    config = {
      redisUrl: 'redis://localhost:6379',
      reportRetentionDays: 90,
      maxReportSize: 10485760,
      emailNotifications: {
        enabled: true,
        recipients: ['admin@example.com'],
      },
      schedules: {
        hourly: '0 * * * *',
        daily: '0 6 * * *',
        weekly: '0 6 * * 1',
        monthly: '0 6 1 * *',
      },
    }

    reportingSystem = new ReportingSystem(mockPrisma, config, registry)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('generatePerformanceReport', () => {
    it('should generate performance report with correct structure', async () => {
      const startTime = new Date('2024-01-01T00:00:00Z')
      const endTime = new Date('2024-01-01T23:59:59Z')
      const period = 'daily'

      const mockResponseTimeMetrics = [
        { avg: 150 },
        { avg: 200 },
        { avg: 100 },
        { avg: 250 },
        { avg: 180 },
      ]

      const mockAlerts = [
        {
          createdAt: new Date('2024-01-01T10:00:00Z'),
          alertType: 'response_time_breach',
          severity: 'HIGH',
          description: 'Response time exceeded threshold',
        },
        {
          createdAt: new Date('2024-01-01T15:30:00Z'),
          alertType: 'error_rate_spike',
          severity: 'CRITICAL',
          description: 'Error rate spike detected',
        },
      ]

      mockPrisma.metricAggregation.findMany.mockResolvedValue(mockResponseTimeMetrics)
      mockPrisma.alert.findMany.mockResolvedValue(mockAlerts)

      const report = await reportingSystem.generatePerformanceReport(period, startTime, endTime)

      expect(report).toEqual({
        period,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        summary: {
          averageResponseTime: expect.any(Number),
          p95ResponseTime: expect.any(Number),
          p99ResponseTime: expect.any(Number),
          errorRate: expect.any(Number),
          uptime: expect.any(Number),
          throughput: expect.any(Number),
        },
        trends: {
          responseTimeTrend: expect.stringMatching(/improving|degrading|stable/),
          errorRateTrend: expect.stringMatching(/improving|degrading|stable/),
          throughputTrend: expect.stringMatching(/increasing|decreasing|stable/),
        },
        alerts: [
          {
            timestamp: '2024-01-01T10:00:00.000Z',
            type: 'response_time_breach',
            severity: 'HIGH',
            description: 'Response time exceeded threshold',
          },
          {
            timestamp: '2024-01-01T15:30:00.000Z',
            type: 'error_rate_spike',
            severity: 'CRITICAL',
            description: 'Error rate spike detected',
          },
        ],
        recommendations: expect.any(Array),
      })

      expect(mockPrisma.metricAggregation.findMany).toHaveBeenCalledWith({
        where: {
          metricName: 'response_time',
          windowStart: { gte: startTime },
          windowEnd: { lte: endTime },
        },
        orderBy: { windowStart: 'asc' },
      })

      expect(mockPrisma.alert.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: startTime, lte: endTime },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    })

    it('should generate appropriate recommendations based on metrics', async () => {
      const startTime = new Date()
      const endTime = new Date()
      const period = 'hourly'

      // Mock high response time and error rate
      mockPrisma.metricAggregation.findMany.mockResolvedValue([{ avg: 300 }]) // High response time
      mockPrisma.alert.findMany.mockResolvedValue([])

      // Mock the private methods to return high values
      vi.spyOn(reportingSystem as any, 'calculateErrorRate').mockResolvedValue(0.02) // High error rate
      vi.spyOn(reportingSystem as any, 'calculateUptime').mockResolvedValue(99.0) // Low uptime

      const report = await reportingSystem.generatePerformanceReport(period, startTime, endTime)

      expect(report.recommendations).toEqual(
        expect.arrayContaining([
          'Consider optimizing database queries to reduce response time',
          'Investigate and fix sources of errors to improve reliability',
          'Implement additional monitoring and alerting to improve uptime',
        ]),
      )
    })
  })

  describe('generateUserEngagementReport', () => {
    it('should generate user engagement report with correct metrics', async () => {
      const startTime = new Date('2024-01-01T00:00:00Z')
      const endTime = new Date('2024-01-07T23:59:59Z')
      const period = 'weekly'

      mockPrisma.user.count.mockResolvedValue(10000)
      mockPrisma.learningEventStream.groupBy.mockResolvedValue([
        { userId: 'user1' },
        { userId: 'user2' },
        { userId: 'user3' },
      ])

      const report = await reportingSystem.generateUserEngagementReport(period, startTime, endTime)

      expect(report).toEqual({
        period,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        metrics: {
          totalUsers: 10000,
          activeUsers: 3,
          newUsers: expect.any(Number),
          returningUsers: expect.any(Number),
          averageSessionDuration: expect.any(Number),
          sessionsPerUser: expect.any(Number),
          retentionRate: expect.any(Number),
          churnRate: expect.any(Number),
        },
        segmentation: {
          byActivity: expect.any(Object),
          byPerformance: expect.any(Object),
          byDevice: expect.any(Object),
          byTimeOfDay: expect.any(Object),
        },
        cohortAnalysis: {
          newUserRetention: expect.any(Array),
          returningUserEngagement: expect.any(Array),
        },
      })
    })
  })

  describe('generateLearningOutcomesReport', () => {
    it('should generate learning outcomes report with performance analysis', async () => {
      const startTime = new Date('2024-01-01T00:00:00Z')
      const endTime = new Date('2024-01-31T23:59:59Z')
      const period = 'monthly'

      const report = await reportingSystem.generateLearningOutcomesReport(
        period,
        startTime,
        endTime,
      )

      expect(report).toEqual({
        period,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        overall: {
          averageAccuracy: expect.any(Number),
          conceptsMastered: expect.any(Number),
          totalLearningTime: expect.any(Number),
          completionRate: expect.any(Number),
          improvementRate: expect.any(Number),
        },
        byCategory: expect.objectContaining({
          'traffic-signs': expect.objectContaining({
            accuracy: expect.any(Number),
            masteryRate: expect.any(Number),
            averageTime: expect.any(Number),
            difficulty: expect.any(Number),
          }),
        }),
        strugglingAreas: expect.arrayContaining([
          expect.objectContaining({
            concept: expect.any(String),
            accuracy: expect.any(Number),
            commonMistakes: expect.any(Array),
            recommendations: expect.any(Array),
          }),
        ]),
        topPerformers: expect.arrayContaining([
          expect.objectContaining({
            userId: expect.any(String),
            accuracy: expect.any(Number),
            conceptsMastered: expect.any(Number),
            learningVelocity: expect.any(Number),
          }),
        ]),
      })
    })
  })

  describe('generateBusinessMetricsReport', () => {
    it('should generate business metrics report with KPIs', async () => {
      const startTime = new Date('2024-01-01T00:00:00Z')
      const endTime = new Date('2024-01-31T23:59:59Z')
      const period = 'monthly'

      const report = await reportingSystem.generateBusinessMetricsReport(period, startTime, endTime)

      expect(report).toEqual({
        period,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        revenue: {
          total: expect.any(Number),
          mrr: expect.any(Number),
          arr: expect.any(Number),
          growth: expect.any(Number),
        },
        users: {
          total: expect.any(Number),
          active: expect.any(Number),
          paying: expect.any(Number),
          churn: expect.any(Number),
        },
        engagement: {
          dau: expect.any(Number),
          mau: expect.any(Number),
          sessionDuration: expect.any(Number),
          retention: expect.any(Number),
        },
        costs: {
          infrastructure: expect.any(Number),
          support: expect.any(Number),
          marketing: expect.any(Number),
          total: expect.any(Number),
        },
        kpis: {
          ltv: expect.any(Number),
          cac: expect.any(Number),
          ltvCacRatio: expect.any(Number),
          grossMargin: expect.any(Number),
        },
      })
    })
  })

  describe('report storage and retrieval', () => {
    it('should store report with correct metadata', async () => {
      const reportType = 'performance'
      const period = 'daily'
      const reportData = {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T23:59:59Z',
        summary: { averageResponseTime: 150 },
      }

      mockPrisma.report.create.mockResolvedValue({ id: 'report-123' })

      const reportId = await reportingSystem.storeReport(reportType, period, reportData)

      expect(reportId).toBe('report-123')
      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          reportType,
          period,
          startTime: new Date(reportData.startTime),
          endTime: new Date(reportData.endTime),
          data: reportData,
          format: 'json',
          size: expect.any(Number),
          status: 'COMPLETED',
        },
      })
    })

    it('should retrieve stored report by ID', async () => {
      const reportId = 'report-123'
      const mockReport = {
        id: reportId,
        reportType: 'performance',
        period: 'daily',
        data: { summary: { averageResponseTime: 150 } },
        createdAt: new Date(),
      }

      mockPrisma.report.findUnique.mockResolvedValue(mockReport)

      const report = await reportingSystem.getReport(reportId)

      expect(report).toEqual(mockReport)
      expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({
        where: { id: reportId },
      })
    })

    it('should throw error when report not found', async () => {
      const reportId = 'nonexistent-report'

      mockPrisma.report.findUnique.mockResolvedValue(null)

      await expect(reportingSystem.getReport(reportId)).rejects.toThrow('Report not found')
    })

    it('should list reports with filters and pagination', async () => {
      const mockReports = [
        {
          id: 'report-1',
          reportType: 'performance',
          period: 'daily',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'report-2',
          reportType: 'performance',
          period: 'daily',
          createdAt: new Date('2024-01-02'),
        },
      ]

      mockPrisma.report.findMany.mockResolvedValue(mockReports)

      const reports = await reportingSystem.listReports('performance', 'daily', 10, 0)

      expect(reports).toEqual(mockReports)
      expect(mockPrisma.report.findMany).toHaveBeenCalledWith({
        where: { reportType: 'performance', period: 'daily' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
        select: {
          id: true,
          reportType: true,
          period: true,
          startTime: true,
          endTime: true,
          format: true,
          size: true,
          status: true,
          createdAt: true,
        },
      })
    })
  })

  describe('scheduled reporting', () => {
    it('should schedule report with correct configuration', async () => {
      const reportType = 'performance'
      const period = 'daily'
      const cronExpression = '0 6 * * *'
      const config = { filters: {}, format: 'json' }

      mockRedis.hset.mockResolvedValue('OK')

      const scheduleId = await reportingSystem.scheduleReport(
        reportType,
        period,
        cronExpression,
        config,
      )

      expect(scheduleId).toMatch(/^[0-9a-f-]{36}$/) // UUID format
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'report_schedules',
        scheduleId,
        JSON.stringify({
          reportType,
          period,
          cronExpression,
          config,
          active: true,
          createdAt: expect.any(String),
        }),
      )
    })
  })

  describe('report cleanup', () => {
    it('should clean up old reports based on retention policy', async () => {
      const mockDeleteResult = { count: 5 }
      mockPrisma.report.deleteMany.mockResolvedValue(mockDeleteResult)

      await reportingSystem['cleanupOldReports']()

      const expectedCutoffDate = new Date(
        Date.now() - config.reportRetentionDays * 24 * 60 * 60 * 1000,
      )

      expect(mockPrisma.report.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
        },
      })

      // Verify the cutoff date is approximately correct (within 1 minute)
      const actualCall = mockPrisma.report.deleteMany.mock.calls[0][0]
      const actualCutoffDate = actualCall.where.createdAt.lt
      const timeDifference = Math.abs(actualCutoffDate.getTime() - expectedCutoffDate.getTime())
      expect(timeDifference).toBeLessThan(60000) // Within 1 minute
    })
  })

  describe('helper methods', () => {
    it('should calculate percentiles correctly', () => {
      const values = [100, 150, 200, 250, 300, 350, 400, 450, 500]

      const p50 = reportingSystem['calculatePercentile'](values, 0.5)
      const p95 = reportingSystem['calculatePercentile'](values, 0.95)
      const p99 = reportingSystem['calculatePercentile'](values, 0.99)

      expect(p50).toBe(300) // 50th percentile
      expect(p95).toBe(500) // 95th percentile
      expect(p99).toBe(500) // 99th percentile (same as 95th for this small dataset)
    })

    it('should handle empty arrays in percentile calculation', () => {
      const result = reportingSystem['calculatePercentile']([], 0.95)
      expect(result).toBe(0)
    })

    it('should calculate period dates correctly', () => {
      const mockNow = new Date('2024-01-15T12:00:00Z')
      vi.setSystemTime(mockNow)

      const hourlyDates = reportingSystem['calculatePeriodDates']('hourly')
      expect(hourlyDates.endTime).toEqual(mockNow)
      expect(hourlyDates.startTime).toEqual(new Date('2024-01-15T11:00:00Z'))

      const dailyDates = reportingSystem['calculatePeriodDates']('daily')
      expect(dailyDates.endTime).toEqual(mockNow)
      expect(dailyDates.startTime).toEqual(new Date('2024-01-14T12:00:00Z'))

      const weeklyDates = reportingSystem['calculatePeriodDates']('weekly')
      expect(weeklyDates.endTime).toEqual(mockNow)
      expect(weeklyDates.startTime).toEqual(new Date('2024-01-08T12:00:00Z'))

      const monthlyDates = reportingSystem['calculatePeriodDates']('monthly')
      expect(monthlyDates.endTime).toEqual(mockNow)
      expect(monthlyDates.startTime).toEqual(new Date('2023-12-16T12:00:00Z'))

      vi.useRealTimers()
    })
  })
})
