'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.StructuredLogger = void 0
exports.createLogger = createLogger
exports.createRequestLogger = createRequestLogger
const pino_1 = __importDefault(require('pino'))
function createLogger(config) {
  const isDevelopment = config.environment === 'development'
  return (0, pino_1.default)({
    name: config.service,
    level: config.level,
    base: {
      service: config.service,
      version: config.version,
      environment: config.environment,
    },
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
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
      error: pino_1.default.stdSerializers.err,
      req: pino_1.default.stdSerializers.req,
      res: pino_1.default.stdSerializers.res,
    },
  })
}
// Request logging middleware for Fastify
function createRequestLogger(logger) {
  return {
    logger,
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
        },
        remoteAddress: req.ip,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type'),
        },
      }),
    },
  }
}
// Structured logging utilities
class StructuredLogger {
  logger
  constructor(logger) {
    this.logger = logger
  }
  info(message, data) {
    this.logger.info(data, message)
  }
  warn(message, data) {
    this.logger.warn(data, message)
  }
  error(message, error, data) {
    this.logger.error({ err: error, ...data }, message)
  }
  debug(message, data) {
    this.logger.debug(data, message)
  }
  // Performance logging
  time(label) {
    this.logger.info({ performance: { start: Date.now() } }, `Starting ${label}`)
  }
  timeEnd(label, startTime) {
    const duration = Date.now() - startTime
    this.logger.info({ performance: { duration, label } }, `Completed ${label} in ${duration}ms`)
  }
  // Business event logging
  businessEvent(event, data) {
    this.logger.info({ event: 'business', type: event, ...data }, `Business event: ${event}`)
  }
  // Security event logging
  securityEvent(event, data) {
    this.logger.warn({ event: 'security', type: event, ...data }, `Security event: ${event}`)
  }
  // Database operation logging
  dbOperation(operation, table, duration, data) {
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
exports.StructuredLogger = StructuredLogger
//# sourceMappingURL=logging.js.map
