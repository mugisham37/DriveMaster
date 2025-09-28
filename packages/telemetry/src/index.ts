import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

let sdk: NodeSDK | null = null

export function startTelemetry(serviceName: string) {
  if (sdk) return
  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName,
  } as any)
  sdk.start().catch((err) => console.error('OTEL start error', err))
}

export async function stopTelemetry() {
  if (!sdk) return
  await sdk.shutdown().catch((err) => console.error('OTEL shutdown error', err))
  sdk = null
}