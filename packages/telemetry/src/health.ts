import type { HealthCheckResult, TelemetryConfig } from './types'

export class HealthMonitor {
  private static instance: HealthMonitor
  private config: TelemetryConfig
  private healthChecks: Map<
    string,
    () => Promise<{
      status: boolean
      latency?: number
      error?: string
      metadata?: Record<string, any>
    }>
  > = new Map()

  private constructor(config: TelemetryConfig) {
    this.config = config
  }

  public static getInstance(config?: TelemetryConfig): HealthMonitor {
    if (!HealthMonitor.instance) {
      if (!config) {
        throw new Error('HealthMonitor must be initialized with config')
      }
      HealthMonitor.instance = new HealthMonitor(config)
    }
    return HealthMonitor.instance
  }

  public registerHealthCheck(
    name: string,
    check: () => Promise<{
      status: boolean
      latency?: number
      error?: string
      metadata?: Record<string, any>
    }>,
  ): void {
    this.healthChecks.set(name, check)
  }

  public async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date()
    const checks: HealthCheckResult['checks'] = {}
    const metrics: HealthCheckResult['metrics'] = {}

    // Run all registered health checks
    for (const [name, check] of this.healthChecks) {
      try {
        const startTime = Date.now()
        const result = await check()
        const endTime = Date.now()

        checks[name] = {
          status: result.status,
          ...(result.latency !== undefined
            ? { latency: result.latency }
            : { latency: endTime - startTime }),
          ...(result.error !== undefined ? { error: result.error } : {}),
          ...(result.metadata !== undefined ? { metadata: result.metadata } : {}),
        }
      } catch (error) {
        checks[name] = {
          status: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    // Collect system metrics
    const systemMetrics = await this.collectSystemMetrics()
    Object.assign(metrics, systemMetrics)

    // Determine overall status
    const allChecksHealthy = Object.values(checks).every((check) => check.status)
    const hasWarnings = Object.values(checks).some((check) => check.latency && check.latency > 1000)

    let status: HealthCheckResult['status']
    if (!allChecksHealthy) {
      status = 'unhealthy'
    } else if (hasWarnings) {
      status = 'degraded'
    } else {
      status = 'healthy'
    }

    return {
      status,
      timestamp,
      checks,
      metrics,
    }
  }

  private async collectSystemMetrics(): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {}

    try {
      // Memory usage
      const memUsage = process.memoryUsage()
      metrics.memory_heap_used = memUsage.heapUsed
      metrics.memory_heap_total = memUsage.heapTotal
      metrics.memory_rss = memUsage.rss
      metrics.memory_external = memUsage.external

      // CPU usage (approximation)
      const cpuUsage = process.cpuUsage()
      metrics.cpu_user_time = cpuUsage.user
      metrics.cpu_system_time = cpuUsage.system

      // Process uptime
      metrics.uptime_seconds = process.uptime()

      // Event loop lag (approximation)
      const start = process.hrtime.bigint()
      await new Promise((resolve) => setImmediate(resolve))
      const end = process.hrtime.bigint()
      metrics.event_loop_lag_ms = Number(end - start) / 1000000
    } catch (error) {
      console.error('Error collecting system metrics:', error)
    }

    return metrics
  }

  // Predefined health checks for common components
  public registerDatabaseHealthCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.registerHealthCheck(name, async () => {
      const startTime = Date.now()
      try {
        const isHealthy = await checkFn()
        const latency = Date.now() - startTime
        return {
          status: isHealthy,
          latency,
          metadata: { type: 'database' },
        }
      } catch (error) {
        return {
          status: false,
          error: error instanceof Error ? error.message : 'Database check failed',
          metadata: { type: 'database' },
        }
      }
    })
  }

  public registerRedisHealthCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.registerHealthCheck(name, async () => {
      const startTime = Date.now()
      try {
        const isHealthy = await checkFn()
        const latency = Date.now() - startTime
        return {
          status: isHealthy,
          latency,
          metadata: { type: 'cache' },
        }
      } catch (error) {
        return {
          status: false,
          error: error instanceof Error ? error.message : 'Redis check failed',
          metadata: { type: 'cache' },
        }
      }
    })
  }

  public registerKafkaHealthCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.registerHealthCheck(name, async () => {
      const startTime = Date.now()
      try {
        const isHealthy = await checkFn()
        const latency = Date.now() - startTime
        return {
          status: isHealthy,
          latency,
          metadata: { type: 'messaging' },
        }
      } catch (error) {
        return {
          status: false,
          error: error instanceof Error ? error.message : 'Kafka check failed',
          metadata: { type: 'messaging' },
        }
      }
    })
  }

  public registerElasticsearchHealthCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.registerHealthCheck(name, async () => {
      const startTime = Date.now()
      try {
        const isHealthy = await checkFn()
        const latency = Date.now() - startTime
        return {
          status: isHealthy,
          latency,
          metadata: { type: 'search' },
        }
      } catch (error) {
        return {
          status: false,
          error: error instanceof Error ? error.message : 'Elasticsearch check failed',
          metadata: { type: 'search' },
        }
      }
    })
  }

  public getHealthEndpoint() {
    return async () => {
      const health = await this.performHealthCheck()
      return {
        status: health.status,
        timestamp: health.timestamp.toISOString(),
        service: this.config.serviceName,
        version: this.config.serviceVersion,
        environment: this.config.environment,
        checks: health.checks,
        metrics: health.metrics,
      }
    }
  }

  public getReadinessEndpoint() {
    return async () => {
      const health = await this.performHealthCheck()
      const isReady = health.status === 'healthy' || health.status === 'degraded'

      return {
        ready: isReady,
        timestamp: health.timestamp.toISOString(),
        service: this.config.serviceName,
        checks: Object.fromEntries(
          Object.entries(health.checks).map(([name, check]) => [name, check.status]),
        ),
      }
    }
  }

  public getLivenessEndpoint() {
    return async () => {
      // Simple liveness check - service is alive if it can respond
      return {
        alive: true,
        timestamp: new Date().toISOString(),
        service: this.config.serviceName,
        uptime: process.uptime(),
      }
    }
  }
}
