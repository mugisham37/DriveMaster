import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api'
import type { TelemetryConfig } from './types'

export class TracingManager {
  private static instance: TracingManager
  private sdk: NodeSDK | null = null
  private config: TelemetryConfig

  private constructor(config: TelemetryConfig) {
    this.config = config
  }

  public static getInstance(config?: TelemetryConfig): TracingManager {
    if (!TracingManager.instance) {
      if (!config) {
        throw new Error('TracingManager must be initialized with config')
      }
      TracingManager.instance = new TracingManager(config)
    }
    return TracingManager.instance
  }

  public initialize(): void {
    if (!this.config.enableTracing) {
      return
    }

    const jaegerExporter = new JaegerExporter({
      endpoint: this.config.jaegerEndpoint || 'http://localhost:14268/api/traces',
    })

    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      }),
      traceExporter: jaegerExporter,
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
  ) {
    const tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion)

    return tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
    })
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
