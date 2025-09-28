import { Registry, collectDefaultMetrics, Counter } from 'prom-client'

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

export function metrics() {
  return registry.metrics()
}