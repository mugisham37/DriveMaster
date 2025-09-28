import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client'

const registry = new Registry()
collectDefaultMetrics({ register: registry })

export const learningEventsCounter = new Counter({
  name: 'learning_events_total',
  help: 'Learning events consumed',
  registers: [registry],
})

export const recommendationsCounter = new Counter({
  name: 'recommendations_total',
  help: 'Recommendation decisions observed',
  registers: [registry],
})

export const recommendationsIngestLagMs = new Histogram({
  name: 'recommendations_ingest_lag_ms',
  help: 'Lag between recommendation event ts and ingestion',
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
  registers: [registry],
})

export function metrics() {
  return registry.metrics()
}
