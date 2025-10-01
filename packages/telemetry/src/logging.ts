import winston from 'winston'
import LokiTransport from 'winston-loki'
import type { TelemetryConfig } from './types'

export class LoggingManager {
  private static instance: LoggingManager
  private logger: winston.Logger
  private config: TelemetryConfig

  private constructor(config: TelemetryConfig) {
    this.config = config
    this.logger = this.createLogger()
  }

  public static getInstance(config?: TelemetryConfig): LoggingManager {
    if (!LoggingManager.instance) {
      if (!config) {
        throw new Error('LoggingManager must be initialized with config')
      }
      LoggingManager.instance = new LoggingManager(config)
    }
    return LoggingManager.instance
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`
          }),
        ),
      }),
    ]

    // Add Loki transport if enabled and endpoint provided
    if (this.config.enableLogging && this.config.lokiEndpoint) {
      transports.push(
        new LokiTransport({
          host: this.config.lokiEndpoint,
          labels: {
            service: this.config.serviceName,
            environment: this.config.environment,
            version: this.config.serviceVersion,
          },
          json: true,
          format: winston.format.json(),
          replaceTimestamp: true,
          onConnectionError: (err) => {
            console.error('Loki connection error:', err)
          },
        }),
      )
    }

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.metadata({
          fillExcept: ['message', 'level', 'timestamp', 'label'],
        }),
      ),
      defaultMeta: {
        service: this.config.serviceName,
        environment: this.config.environment,
        version: this.config.serviceVersion,
      },
      transports,
    })
  }

  public getLogger(): winston.Logger {
    return this.logger
  }

  // Convenience methods
  public info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta)
  }

  public error(message: string, error?: Error, meta?: Record<string, any>): void {
    this.logger.error(message, { error: error?.stack || error, ...meta })
  }

  public warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta)
  }

  public debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta)
  }

  // Learning-specific logging methods
  public logLearningEvent(userId: string, eventType: string, data: Record<string, any>): void {
    this.logger.info('Learning event recorded', {
      userId,
      eventType,
      data,
      component: 'learning_engine',
    })
  }

  public logAlgorithmPerformance(
    algorithm: string,
    metrics: Record<string, number>,
    userId?: string,
  ): void {
    this.logger.info('Algorithm performance metrics', {
      algorithm,
      metrics,
      userId,
      component: 'adaptive_engine',
    })
  }

  public logContentInteraction(
    userId: string,
    contentId: string,
    interactionType: string,
    metadata?: Record<string, any>,
  ): void {
    this.logger.info('Content interaction', {
      userId,
      contentId,
      interactionType,
      metadata,
      component: 'content_service',
    })
  }

  public logAnalyticsEvent(
    eventType: string,
    data: Record<string, any>,
    processingTime?: number,
  ): void {
    this.logger.info('Analytics event processed', {
      eventType,
      data,
      processingTime,
      component: 'analytics_engine',
    })
  }

  public logNotificationEvent(
    userId: string,
    notificationType: string,
    status: 'sent' | 'delivered' | 'clicked' | 'failed',
    metadata?: Record<string, any>,
  ): void {
    this.logger.info('Notification event', {
      userId,
      notificationType,
      status,
      metadata,
      component: 'engagement_service',
    })
  }

  public logSecurityEvent(
    eventType: string,
    userId?: string,
    ipAddress?: string,
    metadata?: Record<string, any>,
  ): void {
    this.logger.warn('Security event', {
      eventType,
      userId,
      ipAddress,
      metadata,
      component: 'security',
    })
  }

  public logPerformanceMetric(
    metricName: string,
    value: number,
    unit: string,
    metadata?: Record<string, any>,
  ): void {
    this.logger.info('Performance metric', {
      metricName,
      value,
      unit,
      metadata,
      component: 'performance',
    })
  }

  public logError(
    error: Error,
    context: string,
    userId?: string,
    metadata?: Record<string, any>,
  ): void {
    this.logger.error(`Error in ${context}`, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      userId,
      context,
      metadata,
    })
  }
}
