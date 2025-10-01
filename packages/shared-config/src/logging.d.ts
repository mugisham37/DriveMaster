import pino from 'pino'
export interface LoggerConfig {
  level: 'error' | 'warn' | 'info' | 'debug'
  service: string
  version: string
  environment: string
}
export declare function createLogger(config: LoggerConfig): pino.Logger
export declare function createRequestLogger(logger: pino.Logger): {
  logger: pino.Logger<never>
  serializers: {
    req: (req: any) => {
      method: any
      url: any
      headers: {
        'user-agent': any
        'content-type': any
      }
      remoteAddress: any
    }
    res: (res: any) => {
      statusCode: any
      headers: {
        'content-type': any
      }
    }
  }
}
export declare class StructuredLogger {
  private logger
  constructor(logger: pino.Logger)
  info(message: string, data?: Record<string, any>): void
  warn(message: string, data?: Record<string, any>): void
  error(message: string, error?: Error, data?: Record<string, any>): void
  debug(message: string, data?: Record<string, any>): void
  time(label: string): void
  timeEnd(label: string, startTime: number): void
  businessEvent(event: string, data: Record<string, any>): void
  securityEvent(event: string, data: Record<string, any>): void
  dbOperation(operation: string, table: string, duration: number, data?: Record<string, any>): void
}
//# sourceMappingURL=logging.d.ts.map
