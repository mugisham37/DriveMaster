import pino from 'pino'

export interface TelemetryConfig {
  serviceName: string
  serviceVersion?: string
  environment?: string
  enableLogging?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  enableMetrics?: boolean
  enableTracing?: boolean
}

export interface LoggingConfig {
  serviceName: string
  serviceVersion: string
  environment: string
  enableLogging: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

let globalLogger: pino.Logger | null = null

/**
 * Initialize telemetry for the service
 */
export function initTelemetry(serviceName: string, config?: Partial<TelemetryConfig>): void {
  const telemetryConfig: TelemetryConfig = {
    serviceName,
    serviceVersion: config?.serviceVersion ?? '1.0.0',
    environment: config?.environment ?? process.env.NODE_ENV ?? 'development',
    enableLogging: config?.enableLogging ?? true,
    logLevel: config?.logLevel ?? 'info',
    enableMetrics: config?.enableMetrics ?? true,
    enableTracing: config?.enableTracing ?? true,
  }

  // Initialize logger
  if (telemetryConfig.enableLogging) {
    globalLogger = pino({
      name: telemetryConfig.serviceName,
      level: telemetryConfig.logLevel,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        service: telemetryConfig.serviceName,
        version: telemetryConfig.serviceVersion,
        environment: telemetryConfig.environment,
      },
    })
  }

  console.log(`Telemetry initialized for ${serviceName}`)
}

/**
 * Get the global logger instance
 */
export function getLogger(): pino.Logger {
  if (!globalLogger) {
    throw new Error('Telemetry not initialized. Call initTelemetry() first.')
  }
  return globalLogger
}

/**
 * Logging manager class for structured logging
 */
export class LoggingManager {
  private logger: pino.Logger
  private static instance: LoggingManager | null = null

  constructor(config: LoggingConfig) {
    this.logger = pino({
      name: config.serviceName,
      level: config.logLevel ?? 'info',
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        service: config.serviceName,
        version: config.serviceVersion,
        environment: config.environment,
      },
    })
  }

  static getInstance(config?: LoggingConfig): LoggingManager {
    if (!LoggingManager.instance) {
      if (!config) {
        throw new Error('LoggingManager not initialized. Provide config on first call.')
      }
      LoggingManager.instance = new LoggingManager(config)
    }
    return LoggingManager.instance
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(meta, message)
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta, message)
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta, message)
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    if (error instanceof Error) {
      this.logger.error({ err: error }, message)
    } else {
      this.logger.error(error, message)
    }
  }
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  const logger = getLogger()
  return logger.child(context)
}

/**
 * Log an error with structured data
 */
export function logError(message: string, error: Error, context?: Record<string, unknown>): void {
  const logger = getLogger()
  logger.error({ err: error, ...context }, message)
}

/**
 * Log an info message with structured data
 */
export function logInfo(message: string, context?: Record<string, unknown>): void {
  const logger = getLogger()
  logger.info(context, message)
}

/**
 * Log a warning with structured data
 */
export function logWarn(message: string, context?: Record<string, unknown>): void {
  const logger = getLogger()
  logger.warn(context, message)
}

/**
 * Log a debug message with structured data
 */
export function logDebug(message: string, context?: Record<string, unknown>): void {
  const logger = getLogger()
  logger.debug(context, message)
}
