import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { Resource } from '@opentelemetry/resources'

let sdk: NodeSDK | undefined

export function initTelemetry(serviceName?: string) {
  if (sdk) return // already initialized

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  if (!endpoint) return // no-op when not configured

  const resource = new Resource({
    'service.name': serviceName || process.env.OTEL_SERVICE_NAME || 'drivemaster-service'
  })

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricExporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
    resource
  })

  sdk.start().catch((e) => console.error('otel start failed', e))
}

export async function shutdownTelemetry() {
  if (!sdk) return
  await sdk.shutdown().catch((e) => console.error('otel shutdown failed', e))
  sdk = undefined
}
