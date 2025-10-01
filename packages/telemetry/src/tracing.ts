import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions'
import {
  trace,
  context,
  SpanStatusCode,
  SpanKind,
  type Span,
  type SpanOptions,
} from '@opentelemetry/api'

import type { TelemetryConfig } from './types'

export class TracingManager {
  private static instance: TracingManager | undefined
  private sdk: NodeSDK | null = null
  private config: TelemetryConfig

  private constructor(config: TelemetryConfig) {
    this.config = config
  }

  public static getInstance(config?: TelemetryConfig): TracingManager {
    if (TracingManager.instance === undefined) {
      if (config === undefined) {
        throw new Error('TracingManager must be initialized with config')
      }
      TracingManager.instance = new TracingManager(config)
    }
    return TracingManager.instance
  }

  public initialize(): void {
    if (this.config.enableTracing !== true) {
      return
    }

    const otlpExporter = new OTLPTraceExporter({
      url:
        typeof this.config.jaegerEndpoint === 'string' && this.config.jaegerEndpoint.length > 0
          ? this.config.jaegerEndpoint
          : 'http://localhost:4318/v1/traces',
    })

    this.sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: this.config.serviceName,
        [ATTR_SERVICE_VERSION]: this.config.serviceVersion,
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      }),
      traceExporter: otlpExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable file system instrumentation to reduce noise
          },
        }),
      ],
    })

    this.sdk.start()
  }

  public shutdown(): Promise<void> {
    if (this.sdk) {
      return this.sdk.shutdown()
    }
    return Promise.resolve()
  }

  public createSpan(
    name: string,
    options?: { kind?: SpanKind; attributes?: Record<string, string | number | boolean> },
  ): Span {
    const tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion)

    const spanOptions: SpanOptions = {
      kind: typeof options?.kind === 'number' ? options.kind : SpanKind.INTERNAL,
    }

    if (options?.attributes !== undefined) {
      spanOptions.attributes = options.attributes
    }

    return tracer.startSpan(name, spanOptions)
  }

  public async withSpan<T>(
    name: string,
    fn: () => Promise<T> | T,
    options?: { kind?: SpanKind; attributes?: Record<string, string | number | boolean> },
  ): Promise<T> {
    const span = this.createSpan(name, options)

    try {
      const result = await context.with(trace.setSpan(context.active(), span), fn)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      span.recordException(error as Error)
      throw error
    } finally {
      span.end()
    }
  }

  public addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan()
    if (span) {
      span.setAttributes(attributes)
    }
  }

  public recordException(error: Error): void {
    const span = trace.getActiveSpan()
    if (span) {
      span.recordException(error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      })
    }
  }

  // Learning-specific tracing helpers
  public async traceLearningSession<T>(
    userId: string,
    sessionId: string,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    return this.withSpan('learning_session', fn, {
      kind: SpanKind.SERVER,
      attributes: {
        'user.id': userId,
        'session.id': sessionId,
        'service.component': 'learning_engine',
      },
    })
  }

  public async traceQuestionGeneration<T>(
    userId: string,
    algorithm: string,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    return this.withSpan('question_generation', fn, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'user.id': userId,
        'algorithm.name': algorithm,
        'service.component': 'adaptive_engine',
      },
    })
  }

  public async traceContentDelivery<T>(
    contentId: string,
    userId: string,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    return this.withSpan('content_delivery', fn, {
      kind: SpanKind.SERVER,
      attributes: {
        'content.id': contentId,
        'user.id': userId,
        'service.component': 'content_service',
      },
    })
  }

  public async traceAnalyticsProcessing<T>(
    eventType: string,
    batchSize: number,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    return this.withSpan('analytics_processing', fn, {
      kind: SpanKind.CONSUMER,
      attributes: {
        'event.type': eventType,
        'batch.size': batchSize,
        'service.component': 'analytics_engine',
      },
    })
  }

  public async traceNotificationDelivery<T>(
    userId: string,
    notificationType: string,
    fn: () => Promise<T> | T,
  ): Promise<T> {
    return this.withSpan('notification_delivery', fn, {
      kind: SpanKind.PRODUCER,
      attributes: {
        'user.id': userId,
        'notification.type': notificationType,
        'service.component': 'engagement_service',
      },
    })
  }
}
