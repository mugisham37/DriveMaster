/**
 * Error Monitor
 * 
 * Comprehensive error monitoring and alerting system for content service
 * Tracks error rates, classifications, trends, and provides alerting capabilities
 * Requirements: 7.1, 7.2
 */

import type { ContentServiceError, ContentServiceErrorType } from '@/types'

export interface ErrorMetrics {
  totalErrors: number
  errorRate: number
  errorsByType: Record<ContentServiceErrorType, number>
  errorsByOperation: Record<string, number>
  errorsByTimeWindow: Record<string, number>
  criticalErrors: number
  recoverableErrors: number
  averageErrorFrequency: number
  errorTrends: ErrorTrend[]
  lastError?: ErrorEvent
  metricsWindow: {
    startTime: Date
    endTime: Date
    duration: number
  }
}

export interface ErrorEvent {
  id: string
  timestamp: Date
  error: ContentServiceError
  operation: string
  severity: ErrorSeverity
  context?: ErrorContext
  resolved: boolean
  resolvedAt?: Date
  resolutionNotes?: string
}

export interface ErrorContext {
  userId?: string
  correlationId?: string
  userAgent?: string
  url?: string
  requestId?: string
  sessionId?: string
  additionalData?: Record<string, unknown>
}

export interface ErrorTrend {
  timeWindow: string
  errorCount: number
  errorRate: number
  dominantErrorType: ContentServiceErrorType
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface ErrorAlert {
  id: string
  timestamp: Date
  severity: AlertSeverity
  title: string
  message: string
  errorType: ContentServiceErrorType
  operation?: string
  threshold: number
  currentValue: number
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ErrorMonitorConfig {
  enableTracking: boolean
  enableAlerting: boolean
  enableTrendAnalysis: boolean
  metricsWindowSize: number // in milliseconds
  maxStoredErrors: number
  alertThresholds: {
    errorRate: number // percentage
    criticalErrorCount: number
    errorFrequency: number // errors per minute
  }
  trendAnalysisInterval: number // in milliseconds
  alertCooldown: number // in milliseconds
}

export interface AlertRule {
  id: string
  name: string
  condition: (metrics: ErrorMetrics) => boolean
  severity: AlertSeverity
  message: string
  cooldown: number
  enabled: boolean
}

export class ErrorMonitor {
  private metrics: ErrorMetrics
  private errors: ErrorEvent[] = []
  private alerts: ErrorAlert[] = []
  private config: ErrorMonitorConfig
  private alertRules: AlertRule[] = []
  private trendTimer?: NodeJS.Timeout
  private observers: ((metrics: ErrorMetrics) => void)[] = []
  private alertObservers: ((alert: ErrorAlert) => void)[] = []
  private lastAlertTimes: Map<string, number> = new Map()

  constructor(config?: Partial<ErrorMonitorConfig>) {
    this.config = {
      enableTracking: true,
      enableAlerting: true,
      enableTrendAnalysis: true,
      metricsWindowSize: 3600000, // 1 hour
      maxStoredErrors: 5000,
      alertThresholds: {
        errorRate: 5, // 5%
        criticalErrorCount: 10,
        errorFrequency: 10 // 10 errors per minute
      },
      trendAnalysisInterval: 300000, // 5 minutes
      alertCooldown: 900000, // 15 minutes
      ...config
    }

    this.metrics = this.initializeMetrics()
    this.setupDefaultAlertRules()
    
    if (this.config.enableTrendAnalysis) {
      this.startTrendAnalysis()
    }
  }

  /**
   * Records an error event
   */
  recordError(error: ContentServiceError, operation: string, context?: ErrorContext): void {
    if (!this.config.enableTracking) return

    const errorEvent: ErrorEvent = {
      id: this.generateErrorId(),
      timestamp: new Date(),
      error,
      operation,
      severity: this.classifyErrorSeverity(error),
      resolved: false,
      ...(context && { context })
    }

    this.errors.push(errorEvent)
    
    // Maintain error buffer size
    if (this.errors.length > this.config.maxStoredErrors) {
      this.errors = this.errors.slice(-this.config.maxStoredErrors)
    }

    // Update metrics
    this.updateMetricsFromError(errorEvent)
    
    // Check for alerts
    if (this.config.enableAlerting) {
      this.checkAlertRules()
    }

    // Notify observers
    this.notifyObservers()
  }

  /**
   * Marks an error as resolved
   */
  resolveError(errorId: string, resolutionNotes?: string): boolean {
    const error = this.errors.find(e => e.id === errorId)
    if (!error || error.resolved) {
      return false
    }

    error.resolved = true
    error.resolvedAt = new Date()
    if (resolutionNotes) {
      error.resolutionNotes = resolutionNotes
    }

    this.notifyObservers()
    return true
  }

  /**
   * Gets current error metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics }
  }

  /**
   * Gets error events with optional filtering
   */
  getErrors(filter?: {
    operation?: string
    errorType?: ContentServiceErrorType
    severity?: ErrorSeverity
    resolved?: boolean
    since?: Date
    limit?: number
  }): ErrorEvent[] {
    let filteredErrors = [...this.errors]

    if (filter) {
      if (filter.operation) {
        filteredErrors = filteredErrors.filter(e => e.operation === filter.operation)
      }
      if (filter.errorType) {
        filteredErrors = filteredErrors.filter(e => e.error.type === filter.errorType)
      }
      if (filter.severity) {
        filteredErrors = filteredErrors.filter(e => e.severity === filter.severity)
      }
      if (filter.resolved !== undefined) {
        filteredErrors = filteredErrors.filter(e => e.resolved === filter.resolved)
      }
      if (filter.since) {
        filteredErrors = filteredErrors.filter(e => e.timestamp >= filter.since!)
      }
      if (filter.limit) {
        filteredErrors = filteredErrors.slice(-filter.limit)
      }
    }

    return filteredErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Gets active alerts
   */
  getAlerts(filter?: {
    severity?: AlertSeverity
    acknowledged?: boolean
    since?: Date
  }): ErrorAlert[] {
    let filteredAlerts = [...this.alerts]

    if (filter) {
      if (filter.severity) {
        filteredAlerts = filteredAlerts.filter(a => a.severity === filter.severity)
      }
      if (filter.acknowledged !== undefined) {
        filteredAlerts = filteredAlerts.filter(a => a.acknowledged === filter.acknowledged)
      }
      if (filter.since) {
        filteredAlerts = filteredAlerts.filter(a => a.timestamp >= filter.since!)
      }
    }

    return filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Acknowledges an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (!alert || alert.acknowledged) {
      return false
    }

    alert.acknowledged = true
    alert.acknowledgedBy = acknowledgedBy
    alert.acknowledgedAt = new Date()

    return true
  }

  /**
   * Gets error summary for dashboard
   */
  getErrorSummary(): {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
    errorRate: number
    criticalErrors: number
    topErrorTypes: Array<{ type: ContentServiceErrorType; count: number; percentage: number }>
    topErrorOperations: Array<{ operation: string; count: number; percentage: number }>
    trend: 'improving' | 'stable' | 'degrading'
    recommendations: string[]
  } {
    const errorRate = this.metrics.errorRate
    const criticalErrors = this.metrics.criticalErrors
    const totalErrors = this.metrics.totalErrors

    // Determine overall health
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent'
    const recommendations: string[] = []

    if (errorRate > 10) {
      overallHealth = 'poor'
      recommendations.push('High error rate detected. Immediate investigation required.')
    } else if (errorRate > 5) {
      overallHealth = 'fair'
      recommendations.push('Elevated error rate. Monitor closely and investigate root causes.')
    } else if (errorRate > 2) {
      overallHealth = 'good'
      recommendations.push('Moderate error rate. Consider preventive measures.')
    }

    if (criticalErrors > 5) {
      overallHealth = 'poor'
      recommendations.push('Multiple critical errors detected. Escalate immediately.')
    } else if (criticalErrors > 0) {
      if (overallHealth === 'excellent') overallHealth = 'good'
      recommendations.push('Critical errors present. Review and resolve promptly.')
    }

    // Get top error types
    const topErrorTypes = Object.entries(this.metrics.errorsByType)
      .map(([type, count]) => ({
        type: type as ContentServiceErrorType,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Get top error operations
    const topErrorOperations = Object.entries(this.metrics.errorsByOperation)
      .map(([operation, count]) => ({
        operation,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Determine trend
    const recentTrends = this.metrics.errorTrends.slice(-3)
    let trend: 'improving' | 'stable' | 'degrading' = 'stable'
    
    if (recentTrends.length >= 2) {
      const latest = recentTrends[recentTrends.length - 1]
      const previous = recentTrends[recentTrends.length - 2]
      
      if (latest && previous) {
        if (latest.errorRate > previous.errorRate * 1.2) {
          trend = 'degrading'
        } else if (latest.errorRate < previous.errorRate * 0.8) {
          trend = 'improving'
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Error rates are within acceptable limits. Continue monitoring.')
    }

    return {
      overallHealth,
      errorRate,
      criticalErrors,
      topErrorTypes,
      topErrorOperations,
      trend,
      recommendations
    }
  }

  /**
   * Adds a custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const alertRule: AlertRule = {
      id: this.generateAlertRuleId(),
      ...rule
    }
    
    this.alertRules.push(alertRule)
    return alertRule.id
  }

  /**
   * Removes an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === ruleId)
    if (index === -1) return false
    
    this.alertRules.splice(index, 1)
    return true
  }

  /**
   * Subscribes to error metrics updates
   */
  subscribe(observer: (metrics: ErrorMetrics) => void): () => void {
    this.observers.push(observer)
    
    return () => {
      const index = this.observers.indexOf(observer)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  /**
   * Subscribes to alert notifications
   */
  subscribeToAlerts(observer: (alert: ErrorAlert) => void): () => void {
    this.alertObservers.push(observer)
    
    return () => {
      const index = this.alertObservers.indexOf(observer)
      if (index > -1) {
        this.alertObservers.splice(index, 1)
      }
    }
  }

  /**
   * Resets all error metrics
   */
  reset(): void {
    this.metrics = this.initializeMetrics()
    this.errors = []
    this.alerts = []
    this.lastAlertTimes.clear()
    this.notifyObservers()
  }

  /**
   * Exports error data
   */
  exportErrorData(): {
    metrics: ErrorMetrics
    errors: ErrorEvent[]
    alerts: ErrorAlert[]
    exportTime: Date
  } {
    return {
      metrics: this.getMetrics(),
      errors: [...this.errors],
      alerts: [...this.alerts],
      exportTime: new Date()
    }
  }

  /**
   * Destroys the error monitor
   */
  destroy(): void {
    if (this.trendTimer) {
      clearInterval(this.trendTimer)
    }
    this.observers = []
    this.alertObservers = []
    this.errors = []
    this.alerts = []
  }

  // Private Methods

  private initializeMetrics(): ErrorMetrics {
    const now = new Date()
    return {
      totalErrors: 0,
      errorRate: 0,
      errorsByType: {} as Record<ContentServiceErrorType, number>,
      errorsByOperation: {},
      errorsByTimeWindow: {},
      criticalErrors: 0,
      recoverableErrors: 0,
      averageErrorFrequency: 0,
      errorTrends: [],
      metricsWindow: {
        startTime: now,
        endTime: new Date(now.getTime() + this.config.metricsWindowSize),
        duration: this.config.metricsWindowSize
      }
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateAlertRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private classifyErrorSeverity(error: ContentServiceError): ErrorSeverity {
    // Classify based on error type and recoverability
    if (error.type === 'server' || error.type === 'service_unavailable') {
      return 'critical'
    }
    
    if (error.type === 'authentication' || error.type === 'authorization') {
      return 'high'
    }
    
    if (error.type === 'validation' || error.type === 'not_found') {
      return 'low'
    }
    
    if (error.type === 'network' || error.type === 'timeout') {
      return error.recoverable ? 'medium' : 'high'
    }
    
    return 'medium'
  }

  private updateMetricsFromError(errorEvent: ErrorEvent): void {
    this.metrics.totalErrors++
    
    // Update error by type
    const errorType = errorEvent.error.type
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1
    
    // Update error by operation
    this.metrics.errorsByOperation[errorEvent.operation] = 
      (this.metrics.errorsByOperation[errorEvent.operation] || 0) + 1
    
    // Update severity counters
    if (errorEvent.severity === 'critical') {
      this.metrics.criticalErrors++
    }
    
    if (errorEvent.error.recoverable) {
      this.metrics.recoverableErrors++
    }
    
    // Update last error
    this.metrics.lastError = errorEvent
    
    // Calculate error frequency (errors per minute)
    const windowStart = new Date(Date.now() - this.config.metricsWindowSize)
    const recentErrors = this.errors.filter(e => e.timestamp >= windowStart)
    const windowMinutes = this.config.metricsWindowSize / 60000
    this.metrics.averageErrorFrequency = recentErrors.length / windowMinutes
  }

  private setupDefaultAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      name: 'High Error Rate',
      condition: (metrics) => metrics.errorRate > this.config.alertThresholds.errorRate,
      severity: 'error',
      message: `Error rate exceeded ${this.config.alertThresholds.errorRate}%`,
      cooldown: this.config.alertCooldown,
      enabled: true
    })

    // Critical errors alert
    this.addAlertRule({
      name: 'Critical Errors',
      condition: (metrics) => metrics.criticalErrors > this.config.alertThresholds.criticalErrorCount,
      severity: 'critical',
      message: `Critical error count exceeded ${this.config.alertThresholds.criticalErrorCount}`,
      cooldown: this.config.alertCooldown,
      enabled: true
    })

    // High error frequency alert
    this.addAlertRule({
      name: 'High Error Frequency',
      condition: (metrics) => metrics.averageErrorFrequency > this.config.alertThresholds.errorFrequency,
      severity: 'warning',
      message: `Error frequency exceeded ${this.config.alertThresholds.errorFrequency} errors per minute`,
      cooldown: this.config.alertCooldown,
      enabled: true
    })
  }

  private checkAlertRules(): void {
    const now = Date.now()
    
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue
      
      // Check cooldown
      const lastAlertTime = this.lastAlertTimes.get(rule.id) || 0
      if (now - lastAlertTime < rule.cooldown) continue
      
      // Check condition
      if (rule.condition(this.metrics)) {
        this.createAlert(rule)
        this.lastAlertTimes.set(rule.id, now)
      }
    }
  }

  private createAlert(rule: AlertRule): void {
    const alert: ErrorAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      severity: rule.severity,
      title: rule.name,
      message: rule.message,
      errorType: this.getMostFrequentErrorType(),
      threshold: this.getThresholdForRule(rule),
      currentValue: this.getCurrentValueForRule(rule),
      acknowledged: false
    }

    this.alerts.push(alert)
    
    // Notify alert observers
    for (const observer of this.alertObservers) {
      try {
        observer(alert)
      } catch (error) {
        console.error('[ErrorMonitor] Error notifying alert observer:', error)
      }
    }
  }

  private getMostFrequentErrorType(): ContentServiceErrorType {
    const errorTypes = Object.entries(this.metrics.errorsByType)
    if (errorTypes.length === 0) return 'server'
    
    return errorTypes.reduce((a, b) => a[1] > b[1] ? a : b)[0] as ContentServiceErrorType
  }

  private getThresholdForRule(rule: AlertRule): number {
    if (rule.name === 'High Error Rate') return this.config.alertThresholds.errorRate
    if (rule.name === 'Critical Errors') return this.config.alertThresholds.criticalErrorCount
    if (rule.name === 'High Error Frequency') return this.config.alertThresholds.errorFrequency
    return 0
  }

  private getCurrentValueForRule(rule: AlertRule): number {
    if (rule.name === 'High Error Rate') return this.metrics.errorRate
    if (rule.name === 'Critical Errors') return this.metrics.criticalErrors
    if (rule.name === 'High Error Frequency') return this.metrics.averageErrorFrequency
    return 0
  }

  private startTrendAnalysis(): void {
    this.trendTimer = setInterval(() => {
      this.analyzeTrends()
    }, this.config.trendAnalysisInterval)
  }

  private analyzeTrends(): void {
    const now = new Date()
    const windowStart = new Date(now.getTime() - this.config.trendAnalysisInterval)
    const windowErrors = this.errors.filter(e => e.timestamp >= windowStart)
    
    const errorCount = windowErrors.length
    const totalRequests = this.getTotalRequestsInWindow(windowStart, now)
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0
    
    // Determine dominant error type
    const errorTypeCounts: Record<string, number> = {}
    for (const error of windowErrors) {
      errorTypeCounts[error.error.type] = (errorTypeCounts[error.error.type] || 0) + 1
    }
    
    const dominantErrorType = Object.entries(errorTypeCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b, ['server', 0])[0] as ContentServiceErrorType
    
    // Determine trend
    const previousTrend = this.metrics.errorTrends[this.metrics.errorTrends.length - 1]
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    
    if (previousTrend) {
      if (errorRate > previousTrend.errorRate * 1.1) {
        trend = 'increasing'
      } else if (errorRate < previousTrend.errorRate * 0.9) {
        trend = 'decreasing'
      }
    }
    
    const errorTrend: ErrorTrend = {
      timeWindow: `${windowStart.toISOString()}-${now.toISOString()}`,
      errorCount,
      errorRate,
      dominantErrorType,
      trend
    }
    
    this.metrics.errorTrends.push(errorTrend)
    
    // Keep only last 24 trends (2 hours if 5-minute intervals)
    if (this.metrics.errorTrends.length > 24) {
      this.metrics.errorTrends = this.metrics.errorTrends.slice(-24)
    }
  }

  private getTotalRequestsInWindow(start: Date, end: Date): number {
    // This would ideally integrate with the performance monitor
    // For now, estimate based on error rate and total errors
    const windowErrors = this.errors.filter(e => e.timestamp >= start && e.timestamp <= end)
    
    // Rough estimation: if we have X errors and assume a 2% error rate, total requests = X / 0.02
    const estimatedErrorRate = 0.02 // 2% default assumption
    return windowErrors.length > 0 ? Math.round(windowErrors.length / estimatedErrorRate) : 0
  }

  private notifyObservers(): void {
    for (const observer of this.observers) {
      try {
        observer(this.getMetrics())
      } catch (error) {
        console.error('[ErrorMonitor] Error notifying observer:', error)
      }
    }
  }
}

// Singleton instance for global use
export const errorMonitor = new ErrorMonitor()