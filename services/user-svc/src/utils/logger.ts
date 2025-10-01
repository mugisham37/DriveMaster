/**
 * Logger utility for database operations
 * Provides structured logging with different levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, unknown>
  error?: Error
}

class Logger {
  private logLevel: LogLevel

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const levelName = LogLevel[entry.level]
    let message = `[${timestamp}] ${levelName}: ${entry.message}`

    if (entry.context) {
      message += ` | Context: ${JSON.stringify(entry.context)}`
    }

    if (entry.error) {
      message += ` | Error: ${entry.error.message}`
      if (
        entry.error.stack !== null &&
        entry.error.stack !== undefined &&
        entry.error.stack !== ''
      ) {
        message += `\nStack: ${entry.error.stack}`
      }
    }

    return message
  }

  private log(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return
    }

    const message = this.formatMessage(entry)

    switch (entry.level) {
      case LogLevel.ERROR:
        // eslint-disable-next-line no-console
        console.error(message)
        break
      case LogLevel.WARN:
        // eslint-disable-next-line no-console
        console.warn(message)
        break
      case LogLevel.INFO:
        // eslint-disable-next-line no-console
        console.info(message)
        break
      case LogLevel.DEBUG:
        // eslint-disable-next-line no-console
        console.debug(message)
        break
    }
  }

  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log({
      level: LogLevel.ERROR,
      message,
      timestamp: new Date(),
      context,
      error,
    })
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: LogLevel.WARN,
      message,
      timestamp: new Date(),
      context,
    })
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: LogLevel.INFO,
      message,
      timestamp: new Date(),
      context,
    })
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log({
      level: LogLevel.DEBUG,
      message,
      timestamp: new Date(),
      context,
    })
  }
}

// Create default logger instance
const logger = new Logger(process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO)

export { logger }
export default logger
