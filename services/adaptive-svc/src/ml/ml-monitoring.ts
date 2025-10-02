import { EventEmitter } from 'events'

import { logger } from '../utils/logger'

import { MLInferenceEngine, ModelPerformanceMetrics } from './inference-engine'
import { ModelServer, ModelPerformanceStats } from './model-server'
import { VectorSearchEngine } from './vector-engine'

export interface MLAlert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  type: 'performance' | 'drift' | 'error' | 'availability'
  modelId: string
  message: string
  details: Record<string, unknown>
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
}

export interface MLMetrics {
  timestamp: Date
  modelMetrics: Record<string, ModelPerformanceMetrics>
  serverMetrics: Record<string, ModelPerformanceStats>
  systemMetrics: {
    totalInferences: number
    avgResponseTime: number
    errorRate: number
    throughput: number
    activeModels: number
    memoryUsage: number
    cpuUsage: number
  }
  vectorMetrics: {
    totalQueries: number
    avgQueryTime: number
    cacheHitRate: number
    indexSize: number
  }
}

export interface AlertRule {
  id: string
  name: string
  condition: (metrics: MLMetrics) => boolean
  severity: 'info' | 'warning' | 'critical'
  type: 'performance' | 'drift' | 'error' | 'availability'
  cooldownMs: number
  enabled: boolean
}

export class MLMonitoringService extends EventEmitter {
  private inferenceEngine: MLInferenceEngine
  private vectorEngine: VectorSearchEngine
  private modelServer: ModelServer
  private alerts: Map<string, MLAlert> = new Map()
  private alertRules: Map<string, AlertRule> = new Map()
  private lastAlertTime: Map<string, number> = new Map()
  private metricsHistory: MLMetrics[] = []
  private readonly maxHistorySize = 1000
  private monitoringInterval: NodeJS.Timeout | null = null
  private readonly monitoringIntervalMs = 30000 // 30 seconds

  constructor(
    inferenceEngine: MLInferenceEngine,
    vectorEngine: VectorSearchEngine,
    modelServer: ModelServer,
  ) {
    super()
    this.inferenceEngine = inferenceEngine
    this.vectorEngine = vectorEngine
    this.modelServer = modelServer
    this.setupDefaultAlertRules()
  }

  /**
   * Start monitoring ML infrastructure
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      logger.warn('Monitoring already started')
      return
    }

    logger.info('Starting ML monitoring service...')

    this.monitoringInterval = setInterval(() => {
      void this.collectAndAnalyzeMetrics().catch((error) => {
        logger.error('Failed to collect and analyze metrics:', error)
      })
    }, this.monitoringIntervalMs)

    // Initial metrics collection
    void this.collectAndAnalyzeMetrics().catch((error) => {
      logger.error('Failed to collect initial metrics:', error)
    })

    logger.info('ML monitoring service started')
    this.emit('monitoringStarted')
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      logger.info('ML monitoring service stopped')
      this.emit('monitoringStopped')
    }
  }

  /**
   * Collect comprehensive metrics from all ML components
   */
  private async collectAndAnalyzeMetrics(): Promise<void> {
    try {
      const timestamp = new Date()

      // Collect model metrics from inference engine
      const loadedModels = this.inferenceEngine.getLoadedModels()
      const modelMetrics: Record<string, ModelPerformanceMetrics> = {}
      for (const model of loadedModels) {
        const metrics = this.inferenceEngine.getModelMetrics(model.id)
        if (metrics) {
          modelMetrics[model.id] = metrics
        }
      }

      // Collect server metrics from model server
      const serverMetrics = this.modelServer.getAllStats()

      // Collect system metrics
      const systemMetrics = this.collectSystemMetrics(modelMetrics, serverMetrics)

      // Collect vector search metrics
      const vectorMetrics = await this.collectVectorMetrics()

      const metrics: MLMetrics = {
        timestamp,
        modelMetrics,
        serverMetrics,
        systemMetrics,
        vectorMetrics,
      }

      // Store metrics history
      this.metricsHistory.push(metrics)
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift()
      }

      // Analyze metrics and trigger alerts
      this.analyzeMetrics(metrics)

      this.emit('metricsCollected', metrics)
    } catch (error) {
      logger.error('Failed to collect ML metrics:', error)
      this.emit('metricsError', error)
    }
  }

  /**
   * Collect system-level metrics
   */
  private collectSystemMetrics(
    modelMetrics: Record<string, ModelPerformanceMetrics>,
    serverMetrics: Record<string, ModelPerformanceStats>,
  ): MLMetrics['systemMetrics'] {
    // Calculate aggregate metrics
    const totalInferences = Object.values(modelMetrics).reduce(
      (sum, m) => sum + m.totalInferences,
      0,
    )

    const avgResponseTime =
      Object.values(serverMetrics).reduce((sum, m) => sum + m.avgLatency, 0) /
      Math.max(Object.keys(serverMetrics).length, 1)

    const totalRequests = Object.values(serverMetrics).reduce((sum, m) => sum + m.totalRequests, 0)
    const totalFailures = Object.values(serverMetrics).reduce((sum, m) => sum + m.failedRequests, 0)
    const errorRate = totalRequests > 0 ? totalFailures / totalRequests : 0

    const throughput = Object.values(serverMetrics).reduce((sum, m) => sum + m.throughput, 0)

    const activeModels = Object.keys(modelMetrics).length

    // Get memory and CPU usage (simplified - would use actual system metrics in production)
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024 // MB
    const cpuUsage = process.cpuUsage().user / 1000000 // Approximate CPU usage

    return {
      totalInferences,
      avgResponseTime,
      errorRate,
      throughput,
      activeModels,
      memoryUsage,
      cpuUsage,
    }
  }

  /**
   * Collect vector search metrics
   */
  private async collectVectorMetrics(): Promise<MLMetrics['vectorMetrics']> {
    try {
      const indexStats = await this.vectorEngine.getIndexStats()

      // Type-safe access to index stats
      const contentIndexStats = indexStats.contentIndex as { totalVectorCount?: number } | undefined
      const userIndexStats = indexStats.userIndex as { totalVectorCount?: number } | undefined

      return {
        totalQueries: contentIndexStats?.totalVectorCount ?? 0,
        avgQueryTime: 50, // Placeholder - would track actual query times
        cacheHitRate: 0.8, // Placeholder - would track actual cache hits
        indexSize:
          (contentIndexStats?.totalVectorCount ?? 0) + (userIndexStats?.totalVectorCount ?? 0),
      }
    } catch (error) {
      logger.warn('Failed to collect vector metrics:', error)
      return {
        totalQueries: 0,
        avgQueryTime: 0,
        cacheHitRate: 0,
        indexSize: 0,
      }
    }
  }

  /**
   * Analyze metrics and trigger alerts
   */
  private analyzeMetrics(metrics: MLMetrics): void {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue

      try {
        const shouldAlert = rule.condition(metrics)

        if (shouldAlert) {
          const lastAlertTime = this.lastAlertTime.get(ruleId) ?? 0
          const now = Date.now()

          // Check cooldown period
          if (now - lastAlertTime > rule.cooldownMs) {
            this.triggerAlert(rule, metrics)
            this.lastAlertTime.set(ruleId, now)
          }
        }
      } catch (error) {
        logger.error(`Error evaluating alert rule ${ruleId}:`, error)
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, metrics: MLMetrics): void {
    const alertId = `${rule.id}-${Date.now()}`

    const alert: MLAlert = {
      id: alertId,
      severity: rule.severity,
      type: rule.type,
      modelId: 'system', // Would be specific model ID for model-specific alerts
      message: rule.name,
      details: {
        ruleId: rule.id,
        metrics: this.extractRelevantMetrics(rule, metrics),
      },
      timestamp: new Date(),
      resolved: false,
    }

    this.alerts.set(alertId, alert)

    logger.info(`ML Alert triggered: ${alert.severity.toUpperCase()} - ${alert.message}`)
    this.emit('alertTriggered', alert)

    // Auto-resolve info alerts after 5 minutes
    if (alert.severity === 'info') {
      setTimeout(
        () => {
          this.resolveAlert(alertId, 'Auto-resolved')
        },
        5 * 60 * 1000,
      )
    }
  }

  /**
   * Extract relevant metrics for alert details
   */
  private extractRelevantMetrics(rule: AlertRule, metrics: MLMetrics): unknown {
    switch (rule.type) {
      case 'performance':
        return {
          avgResponseTime: metrics.systemMetrics.avgResponseTime,
          throughput: metrics.systemMetrics.throughput,
          errorRate: metrics.systemMetrics.errorRate,
        }
      case 'error':
        return {
          errorRate: metrics.systemMetrics.errorRate,
          totalInferences: metrics.systemMetrics.totalInferences,
        }
      case 'availability':
        return {
          activeModels: metrics.systemMetrics.activeModels,
          memoryUsage: metrics.systemMetrics.memoryUsage,
        }
      case 'drift':
        return {
          modelMetrics: Object.fromEntries(
            Object.entries(metrics.modelMetrics).map(([id, m]) => [
              id,
              { driftScore: m.driftScore },
            ]),
          ),
        }
      default:
        return metrics.systemMetrics
    }
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    // High error rate alert
    this.alertRules.set('high-error-rate', {
      id: 'high-error-rate',
      name: 'High Error Rate Detected',
      condition: (metrics) => metrics.systemMetrics.errorRate > 0.1,
      severity: 'warning',
      type: 'error',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      enabled: true,
    })

    // Critical error rate alert
    this.alertRules.set('critical-error-rate', {
      id: 'critical-error-rate',
      name: 'Critical Error Rate Detected',
      condition: (metrics) => metrics.systemMetrics.errorRate > 0.25,
      severity: 'critical',
      type: 'error',
      cooldownMs: 2 * 60 * 1000, // 2 minutes
      enabled: true,
    })

    // High response time alert
    this.alertRules.set('high-response-time', {
      id: 'high-response-time',
      name: 'High Response Time Detected',
      condition: (metrics) => metrics.systemMetrics.avgResponseTime > 1000,
      severity: 'warning',
      type: 'performance',
      cooldownMs: 5 * 60 * 1000,
      enabled: true,
    })

    // Low throughput alert
    this.alertRules.set('low-throughput', {
      id: 'low-throughput',
      name: 'Low Throughput Detected',
      condition: (metrics) => metrics.systemMetrics.throughput < 10,
      severity: 'warning',
      type: 'performance',
      cooldownMs: 10 * 60 * 1000, // 10 minutes
      enabled: true,
    })

    // Model drift alert
    this.alertRules.set('model-drift', {
      id: 'model-drift',
      name: 'Model Drift Detected',
      condition: (metrics) => Object.values(metrics.modelMetrics).some((m) => m.driftScore > 0.2),
      severity: 'warning',
      type: 'drift',
      cooldownMs: 30 * 60 * 1000, // 30 minutes
      enabled: true,
    })

    // High memory usage alert
    this.alertRules.set('high-memory-usage', {
      id: 'high-memory-usage',
      name: 'High Memory Usage Detected',
      condition: (metrics) => metrics.systemMetrics.memoryUsage > 1000, // 1GB
      severity: 'warning',
      type: 'availability',
      cooldownMs: 15 * 60 * 1000, // 15 minutes
      enabled: true,
    })

    // No active models alert
    this.alertRules.set('no-active-models', {
      id: 'no-active-models',
      name: 'No Active Models',
      condition: (metrics) => metrics.systemMetrics.activeModels === 0,
      severity: 'critical',
      type: 'availability',
      cooldownMs: 1 * 60 * 1000, // 1 minute
      enabled: true,
    })

    logger.info(`Configured ${this.alertRules.size} default alert rules`)
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule)
    logger.info(`Added alert rule: ${rule.name}`)
    this.emit('alertRuleAdded', rule)
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    if (this.alertRules.delete(ruleId)) {
      logger.info(`Removed alert rule: ${ruleId}`)
      this.emit('alertRuleRemoved', ruleId)
    }
  }

  /**
   * Enable/disable alert rule
   */
  toggleAlertRule(ruleId: string, enabled: boolean): void {
    const rule = this.alertRules.get(ruleId)
    if (rule) {
      rule.enabled = enabled
      logger.info(`Alert rule ${ruleId} ${enabled ? 'enabled' : 'disabled'}`)
      this.emit('alertRuleToggled', { ruleId, enabled })
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolution: string): void {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      alert.details.resolution = resolution

      logger.info(`Alert resolved: ${alertId} - ${resolution}`)
      this.emit('alertResolved', alert)
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): MLAlert[] {
    return Array.from(this.alerts.values()).filter((alert) => !alert.resolved)
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): MLAlert[] {
    return Array.from(this.alerts.values())
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: 'info' | 'warning' | 'critical'): MLAlert[] {
    return Array.from(this.alerts.values()).filter((alert) => alert.severity === severity)
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MLMetrics | null {
    return this.metricsHistory[this.metricsHistory.length - 1] ?? null
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): MLMetrics[] {
    if (limit != null) {
      return this.metricsHistory.slice(-limit)
    }
    return [...this.metricsHistory]
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values())
  }

  /**
   * Generate health report
   */
  generateHealthReport(): {
    overall: 'healthy' | 'warning' | 'critical'
    summary: string
    details: {
      activeAlerts: number
      criticalAlerts: number
      warningAlerts: number
      systemMetrics: MLMetrics['systemMetrics']
      recommendations: string[]
    }
  } {
    const activeAlerts = this.getActiveAlerts()
    const criticalAlerts = activeAlerts.filter((a) => a.severity === 'critical')
    const warningAlerts = activeAlerts.filter((a) => a.severity === 'warning')
    const currentMetrics = this.getCurrentMetrics()

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy'
    let summary = 'All ML systems operating normally'
    const recommendations: string[] = []

    if (criticalAlerts.length > 0) {
      overall = 'critical'
      summary = `${criticalAlerts.length} critical issues require immediate attention`
      recommendations.push('Address critical alerts immediately')
    } else if (warningAlerts.length > 0) {
      overall = 'warning'
      summary = `${warningAlerts.length} warnings detected`
      recommendations.push('Review and address warning alerts')
    }

    if (currentMetrics) {
      if ((currentMetrics.systemMetrics.errorRate ?? 0) > 0.05) {
        recommendations.push('Investigate error rate increase')
      }
      if ((currentMetrics.systemMetrics.avgResponseTime ?? 0) > 500) {
        recommendations.push('Optimize model performance')
      }
      if ((currentMetrics.systemMetrics.memoryUsage ?? 0) > 800) {
        recommendations.push('Monitor memory usage')
      }
    }

    return {
      overall,
      summary,
      details: {
        activeAlerts: activeAlerts.length,
        criticalAlerts: criticalAlerts.length,
        warningAlerts: warningAlerts.length,
        systemMetrics: currentMetrics?.systemMetrics ?? ({} as MLMetrics['systemMetrics']),
        recommendations,
      },
    }
  }

  /**
   * Clean up old alerts and metrics
   */
  cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    // Remove old resolved alerts
    for (const [alertId, alert] of this.alerts) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt.getTime() < oneWeekAgo) {
        this.alerts.delete(alertId)
      }
    }

    // Keep only recent metrics
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    this.metricsHistory = this.metricsHistory.filter((m) => m.timestamp.getTime() > oneDayAgo)

    logger.info('ML monitoring cleanup completed')
  }

  /**
   * Shutdown monitoring service
   */
  shutdown(): void {
    this.stopMonitoring()
    this.cleanup()
    logger.info('ML monitoring service shutdown complete')
    this.emit('shutdown')
  }
}
