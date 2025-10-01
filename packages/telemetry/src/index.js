'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.initTelemetry = initTelemetry
exports.shutdownTelemetry = shutdownTelemetry
const sdk_node_1 = require('@opentelemetry/sdk-node')
const exporter_trace_otlp_http_1 = require('@opentelemetry/exporter-trace-otlp-http')
const exporter_metrics_otlp_http_1 = require('@opentelemetry/exporter-metrics-otlp-http')
const resources_1 = require('@opentelemetry/resources')
let sdk
function initTelemetry(serviceName) {
  if (sdk) return // already initialized
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  if (!endpoint) return // no-op when not configured
  const resource = new resources_1.Resource({
    'service.name': serviceName || process.env.OTEL_SERVICE_NAME || 'drivemaster-service',
  })
  sdk = new sdk_node_1.NodeSDK({
    traceExporter: new exporter_trace_otlp_http_1.OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
    }),
    metricExporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
    }),
    resource,
  })
  sdk.start().catch((e) => console.error('otel start failed', e))
}
async function shutdownTelemetry() {
  if (!sdk) return
  await sdk.shutdown().catch((e) => console.error('otel shutdown failed', e))
  sdk = undefined
}
//# sourceMappingURL=index.js.map
