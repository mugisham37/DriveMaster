import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'

import { FastifyRequest, FastifyReply } from 'fastify'

export interface PerformanceMetrics {
  requestId: string
  method: string
  url: string
  statusCode: number
  responseTime: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
  timestamp: number
  userAgent?: string | undefined
  userId?: string | undefined
  service: string
}

export interface PerformanceBudget {
  responseTime: {
    p50: number
    p95: number
    p99: number
  }
  memoryUsage: {
    heapUsed: number
    heapTotal: number
  }
  errorRate: number
  throughput: number // requests per second
}

export interface AlertConfig {
  responseTimeThreshold: number
  errorRateThreshold: number
  memoryThreshold: number
  cpuThreshold: number
}

export interface PerformanceStats {
  requestCount: number
  errorCount: number
  errorRate: number
  responseTime: { p50: number; p95: number; p99: number; avg: number }
  throughput: number
  memoryUsage: NodeJS.MemoryUsage
  uptime: number
  service: string
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics[] = []
  private budget: PerformanceBudget
  private alertConfig: AlertConfig
  private serviceName: string
  private startTime: number
  private requestCount: number = 0
  private errorCount: number = 0

  constructor(serviceName: string, budget: PerformanceBudget, alertConfig: AlertConfig) {
    super()
    this.serviceName = serviceName
    this.budget = budget
    this.alertConfig = alertConfig
    this.startTime = Date.now()

    // Start periodic monitoring
    this.startPeriodicMonitoring()
  }

  /**
   * Create Fastify hooks for performance monitoring
   */
  createHooks(): {
    onRequest: (request: FastifyRequest) => void
    onSend: (request: FastifyRequest, reply: FastifyReply, payload: unknown) => Promise<unknown>
  } {
    return {
      onRequest: (request: FastifyRequest): void => {
        const startTime = performance.now()
        const startCpuUsage = process.cpuUsage()
        const requestIdHeader = request.headers['x-request-id'] as string | undefined
        const requestId =
          requestIdHeader !== undefined && requestIdHeader !== ''
            ? requestIdHeader
            : this.generateRequestId()

        // Store performance data in request context
        ;(
          request as FastifyRequest & {
            performanceData?: {
              startTime: number
              startCpuUsage: NodeJS.CpuUsage
              requestId: string
            }
          }
        ).performanceData = {
          startTime,
          startCpuUsage,
          requestId,
        }
      },

      onSend: async (
        request: FastifyRequest,
        reply: FastifyReply,
        payload: unknown,
      ): Promise<unknown> => {
        const performanceData = (
          request as FastifyRequest & {
            performanceData?: {
              startTime: number
              startCpuUsage: NodeJS.CpuUsage
              requestId: string
            }
          }
        ).performanceData

        if (performanceData === undefined) {
          return payload
        }

        const endTime = performance.now()
        const responseTime = endTime - performanceData.startTime
        const cpuUsage = process.cpuUsage(performanceData.startCpuUsage)

        const userAgent = request.headers['user-agent']
        const userId = (request as FastifyRequest & { user?: { id?: string } }).user?.id

        const metrics: PerformanceMetrics = {
          requestId: performanceData.requestId,
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          responseTime,
          memoryUsage: process.memoryUsage(),
          cpuUsage,
          timestamp: Date.now(),
          userAgent,
          userId,
          service: this.serviceName,
        }

        this.recordMetrics(metrics)
        this.checkPerformanceBudget(metrics)

        // Add performance headers
        void reply.header('X-Response-Time', `${responseTime.toFixed(2)}ms`)
        void reply.header('X-Request-ID', performanceData.requestId)

        return payload
      },
    }
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)
    this.requestCount++

    if (metrics.statusCode >= 400) {
      this.errorCount++
    }

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }

    // Emit metrics event for external processing
    this.emit('metrics', metrics)

    // Check for alerts
    this.checkAlerts(metrics)
  }

  /**
   * Check performance budget violations
   */
  private checkPerformanceBudget(metrics: PerformanceMetrics): void {
    const recentMetrics = this.getRecentMetrics(60000) // Last minute

    if (recentMetrics.length === 0) return

    const responseTimes = recentMetrics.map((m) => m.responseTime).sort((a, b) => a - b)
    const p50 = this.percentile(responseTimes, 0.5)
    const p95 = this.percentile(responseTimes, 0.95)
    const p99 = this.percentile(responseTimes, 0.99)

    const budgetViolations: string[] = []

    if (p50 > this.budget.responseTime.p50) {
      budgetViolations.push(
        `P50 response time: ${p50.toFixed(2)}ms > ${this.budget.responseTime.p50}ms`,
      )
    }

    if (p95 > this.budget.responseTime.p95) {
      budgetViolations.push(
        `P95 response time: ${p95.toFixed(2)}ms > ${this.budget.responseTime.p95}ms`,
      )
    }

    if (p99 > this.budget.responseTime.p99) {
      budgetViolations.push(
        `P99 response time: ${p99.toFixed(2)}ms > ${this.budget.responseTime.p99}ms`,
      )
    }

    const errorRate = this.getErrorRate()
    if (errorRate > this.budget.errorRate) {
      budgetViolations.push(
        `Error rate: ${(errorRate * 100).toFixed(2)}% > ${(this.budget.errorRate * 100).toFixed(2)}%`,
      )
    }

    const memoryUsage = metrics.memoryUsage
    if (memoryUsage.heapUsed > this.budget.memoryUsage.heapUsed) {
      budgetViolations.push(
        `Heap used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB > ${(this.budget.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      )
    }

    if (budgetViolations.length > 0) {
      this.emit('budgetViolation', {
        service: this.serviceName,
        violations: budgetViolations,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const alerts: string[] = []

    // Response time alert
    if (metrics.responseTime > this.alertConfig.responseTimeThreshold) {
      alerts.push(`High response time: ${metrics.responseTime.toFixed(2)}ms`)
    }

    // Memory usage alert
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024
    if (memoryUsageMB > this.alertConfig.memoryThreshold) {
      alerts.push(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`)
    }

    // CPU usage alert (simplified check)
    const cpuPercent = (metrics.cpuUsage.user + metrics.cpuUsage.system) / 1000000 // Convert to seconds
    if (cpuPercent > this.alertConfig.cpuThreshold) {
      alerts.push(`High CPU usage: ${cpuPercent.toFixed(2)}s`)
    }

    // Error rate alert
    const errorRate = this.getErrorRate()
    if (errorRate > this.alertConfig.errorRateThreshold) {
      alerts.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`)
    }

    if (alerts.length > 0) {
      this.emit('alert', {
        service: this.serviceName,
        requestId: metrics.requestId,
        alerts,
        metrics,
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindow: number = 300000): PerformanceStats {
    // Default 5 minutes
    const recentMetrics = this.getRecentMetrics(timeWindow)

    if (recentMetrics.length === 0) {
      return {
        requestCount: 0,
        errorCount: 0,
        errorRate: 0,
        responseTime: { p50: 0, p95: 0, p99: 0, avg: 0 },
        throughput: 0,
        memoryUsage: process.memoryUsage(),
        uptime: Date.now() - this.startTime,
        service: this.serviceName,
      }
    }

    const responseTimes = recentMetrics.map((m) => m.responseTime).sort((a, b) => a - b)
    const errors = recentMetrics.filter((m) => m.statusCode >= 400)
    const timeWindowSeconds = timeWindow / 1000

    return {
      requestCount: recentMetrics.length,
      errorCount: errors.length,
      errorRate: errors.length / recentMetrics.length,
      responseTime: {
        p50: this.percentile(responseTimes, 0.5),
        p95: this.percentile(responseTimes, 0.95),
        p99: this.percentile(responseTimes, 0.99),
        avg: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      },
      throughput: recentMetrics.length / timeWindowSeconds,
      memoryUsage: process.memoryUsage(),
      uptime: Date.now() - this.startTime,
      service: this.serviceName,
    }
  }

  /**
   * Get health check status
   */
  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: unknown } {
    const stats = this.getStats()
    const issues: string[] = []

    // Check response time
    if (stats.responseTime.p95 > this.budget.responseTime.p95) {
      issues.push('High response time')
    }

    // Check error rate
    if (stats.errorRate > this.budget.errorRate) {
      issues.push('High error rate')
    }

    // Check memory usage
    const memoryUsageMB = stats.memoryUsage.heapUsed / 1024 / 1024
    if (memoryUsageMB > this.budget.memoryUsage.heapUsed / 1024 / 1024) {
      issues.push('High memory usage')
    }

    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (issues.length === 0) {
      status = 'healthy'
    } else if (issues.length <= 2) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }

    return {
      status,
      details: {
        issues,
        stats,
        timestamp: Date.now(),
      },
    }
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(format: 'prometheus' | 'json' = 'json'): string {
    const stats = this.getStats()

    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(stats)
    }

    return JSON.stringify(stats, null, 2)
  }

  // Private methods

  private getRecentMetrics(timeWindow: number): PerformanceMetrics[] {
    const cutoff = Date.now() - timeWindow
    return this.metrics.filter((m) => m.timestamp > cutoff)
  }

  private getErrorRate(): number {
    if (this.requestCount === 0) return 0
    return this.errorCount / this.requestCount
  }

  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil(sortedArray.length * percentile) - 1
    return sortedArray[Math.max(0, index)] ?? 0
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  private startPeriodicMonitoring(): void {
    // Emit system stats every 30 seconds
    setInterval(() => {
      const systemStats = {
        service: this.serviceName,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime(),
        timestamp: Date.now(),
      }

      this.emit('systemStats', systemStats)
    }, 30000)

    // Clean up old metrics every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - 300000 // 5 minutes
      this.metrics = this.metrics.filter((m) => m.timestamp > cutoff)
    }, 300000)
  }

  private formatPrometheusMetrics(stats: PerformanceStats): string {
    const serviceName = this.serviceName.replace(/-/g, '_')

    return `
# HELP ${serviceName}_requests_total Total number of requests
# TYPE ${serviceName}_requests_total counter
${serviceName}_requests_total ${stats.requestCount}

# HELP ${serviceName}_request_duration_seconds Request duration in seconds
# TYPE ${serviceName}_request_duration_seconds histogram
${serviceName}_request_duration_seconds{quantile="0.5"} ${stats.responseTime.p50 / 1000}
${serviceName}_request_duration_seconds{quantile="0.95"} ${stats.responseTime.p95 / 1000}
${serviceName}_request_duration_seconds{quantile="0.99"} ${stats.responseTime.p99 / 1000}

# HELP ${serviceName}_errors_total Total number of errors
# TYPE ${serviceName}_errors_total counter
${serviceName}_errors_total ${stats.errorCount}

# HELP ${serviceName}_memory_usage_bytes Memory usage in bytes
# TYPE ${serviceName}_memory_usage_bytes gauge
${serviceName}_memory_usage_bytes{type="heap_used"} ${stats.memoryUsage.heapUsed}
${serviceName}_memory_usage_bytes{type="heap_total"} ${stats.memoryUsage.heapTotal}
${serviceName}_memory_usage_bytes{type="external"} ${stats.memoryUsage.external}

# HELP ${serviceName}_throughput_rps Requests per second
# TYPE ${serviceName}_throughput_rps gauge
${serviceName}_throughput_rps ${stats.throughput}
    `.trim()
  }
}

// Factory function for creating performance monitor
export function createPerformanceMonitor(
  serviceName: string,
  customBudget?: Partial<PerformanceBudget>,
  customAlertConfig?: Partial<AlertConfig>,
): PerformanceMonitor {
  const defaultBudget: PerformanceBudget = {
    responseTime: {
      p50: 50, // 50ms
      p95: 100, // 100ms
      p99: 200, // 200ms
    },
    memoryUsage: {
      heapUsed: 512 * 1024 * 1024, // 512MB
      heapTotal: 1024 * 1024 * 1024, // 1GB
    },
    errorRate: 0.01, // 1%
    throughput: 100, // 100 RPS
  }

  const defaultAlertConfig: AlertConfig = {
    responseTimeThreshold: 1000, // 1 second
    errorRateThreshold: 0.05, // 5%
    memoryThreshold: 800, // 800MB
    cpuThreshold: 0.8, // 80%
  }

  const budget = { ...defaultBudget, ...customBudget }
  const alertConfig = { ...defaultAlertConfig, ...customAlertConfig }

  return new PerformanceMonitor(serviceName, budget, alertConfig)
}
