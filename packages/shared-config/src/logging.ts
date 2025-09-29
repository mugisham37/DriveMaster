import pino from 'pino'

export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug'
  service: string
  version: string
  environment: string
}

export function createLogger(config: LoggerConfig): pino.Logger {
  const isDevelopment = config.environment === 'development'

  return pino({
    name: config.service,
    level: config.level,
    base: {
      service: config.service,
      version: config.version,
      environment: config.environment,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    ...(isDevelopment && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }),
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  })
}

// Request logging middleware for Fastify
export function createRequestLogger(logger: pino.Logger) {
  return {
    logger,
    serializers: {
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
        remoteAddress: req.ip,
      }),
      res: (res: any) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type'),
        },
      }),
    },
  }
}

// Structured logging utilities
export class StructuredLogger {
  constructor(private logger: pino.Logger) {}

  info(message: string, data?: Record<string, any>): void {
    this.logger.info(data, message)
  }

  warn(message: string, data?: Record<string, any>): void {
    this.logger.warn(data, message)
  }

  error(message: string, error?: Error, data?: Record<string, any>): void {
    this.logger.error({ err: error, ...data }, message)
  }

  debug(message: string, data?: Record<string, any>): void {
    this.logger.debug(data, message)
  }

  // Performance logging
  time(label: string): void {
    this.logger.info({ performance: { start: Date.now() } }, `Starting ${label}`)
  }

  timeEnd(label: string, startTime: number): void {
    const duration = Date.now() - startTime
    this.logger.info({ performance: { duration, label } }, `Completed ${label} in ${duration}ms`)
  }

  // Business event logging
  businessEvent(event: string, data: Record<string, any>): void {
    this.logger.info({ event: 'business', type: event, ...data }, `Business event: ${event}`)
  }

  // Security event logging
  securityEvent(event: string, data: Record<string, any>): void {
    this.logger.warn({ event: 'security', type: event, ...data }, `Security event: ${event}`)
  }

  // Database operation logging
  dbOperation(
    operation: string,
    table: string,
    duration: number,
    data?: Record<string, any>,
  ): void {
    this.logger.debug(
      {
        event: 'database',
        operation,
        table,
        duration,
        ...data,
      },
      `Database ${operation} on ${table} completed in ${duration}ms`,
    )
  }
}
