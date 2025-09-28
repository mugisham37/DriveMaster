import { createKafka } from '@drivemaster/kafka-client'
import { learningEventsCounter, recommendationsCounter, recommendationsIngestLagMs, decisionOutcomeCounter, decisionToOutcomeLagMs } from '../metrics'

export async function startConsumers(brokers: string[]) {
  const kafka = createKafka(brokers.split(','), 'analytics-svc')
  const consumer = kafka.consumer({ groupId: 'analytics-svc-group' })
  await consumer.connect()
  await consumer.subscribe({ topic: 'learning.events.v1', fromBeginning: false })
  await consumer.subscribe({ topic: 'recommendations.decisions.v1', fromBeginning: false })

  // In-memory join cache: userId -> Map(armId -> ts)
  const decisions = new Map<string, Map<string, number>>()
  const DECISION_TTL_MS = 10 * 60 * 1000

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const now = Date.now()
      try {
        const payload = message.value ? JSON.parse(message.value.toString()) : null
        if (topic === 'recommendations.decisions.v1') {
          recommendationsCounter.inc()
          const ts = payload?.ts ? Number(payload.ts) : (message.timestamp ? Number(message.timestamp) : now)
          const lag = Math.max(0, now - ts)
          recommendationsIngestLagMs.observe(lag)
          const userId = payload?.userId
          const armId = payload?.chosenArmId
          if (userId && armId) {
            const m = decisions.get(userId) ?? new Map<string, number>()
            m.set(armId, now)
            decisions.set(userId, m)
          }
        }
        if (topic === 'learning.events.v1') {
          learningEventsCounter.inc()
          const userId = payload?.userId
          const armId = payload?.armId
          const correct = !!payload?.correct
          if (userId && armId) {
            const m = decisions.get(userId)
            const ts = m?.get(armId)
            if (ts && now - ts < DECISION_TTL_MS) {
              decisionOutcomeCounter.labels(correct ? 'success' : 'failure').inc()
              decisionToOutcomeLagMs.observe(now - ts)
              m?.delete(armId)
            }
          }
        }
      } catch {
        // ignore parse errors
      }

      // Periodic cleanup
      if (Math.random() < 0.01) {
        const cutoff = now - DECISION_TTL_MS
        for (const [userId, m] of decisions) {
          for (const [armId, ts] of m) if (ts < cutoff) m.delete(armId)
          if (m.size === 0) decisions.delete(userId)
        }
      }
    },
  })
}
