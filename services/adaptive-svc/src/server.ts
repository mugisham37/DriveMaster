import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { selectNextItem } from './algorithms/mab'
import { bktUpdate } from './algorithms/bkt'
import { scheduleNext } from './algorithms/spaced'
import { estimateTheta } from './algorithms/irt'
import { randomUUID } from 'crypto'
import { Topics, RecommendationDecisionSchema } from '@drivemaster/contracts'
import { createKafka } from '@drivemaster/kafka-client'

initTelemetry('adaptive-svc')
const env = loadEnv()
const app = Fastify({ logger: true })
await app.register(jwt, { secret: env.JWT_SECRET || 'change_me' })

app.get('/health', async () => ({ status: 'ok' }))

// Example endpoint to choose next item (stubbed selection)
app.post('/recommendation', async (req, reply) => {
  const body = (req.body ?? {}) as any
  const { userId, conceptKey, candidates } = body
  if (!userId || !conceptKey || !Array.isArray(candidates) || candidates.length === 0) {
    return reply.code(400).send({ error: 'Invalid payload' })
  }
  const scores = candidates.map((c: any) => ({ id: c.id, score: Math.random() }))
  const chosen = selectNextItem(scores)

  // Example model calls (not used in selection here)
  const updated = bktUpdate({ pL0: 0.3, pT: 0.1, pG: 0.2, pS: 0.1 }, true)
  const nextReview = scheduleNext(3, true)
  const theta = estimateTheta([{ a: 1.0, b: 0.0, c: 0.2, correct: true }])
  app.log.info({ updated, nextReview, theta }, 'algo-snapshots')

  // Emit recommendation decision if Kafka configured
  if (env.KAFKA_BROKERS) {
    const kafka = createKafka({ brokers: env.KAFKA_BROKERS.split(',') })
    const producer = kafka.producer()
    await producer.connect()
    const decision = {
      decisionId: randomUUID(),
      userId,
      conceptKey,
      itemId: chosen.id,
      score: chosen.score,
      ts: Date.now()
    }
    const parsed = RecommendationDecisionSchema.parse(decision)
    await producer.send({
      topic: Topics.RecommendationDecisions,
      messages: [{ key: userId, value: JSON.stringify(parsed) }]
    })
    await producer.disconnect()
  }

  return { itemId: chosen.id }
})

app.listen({ port: env.PORT || 3002, host: '0.0.0.0' })
  .then(() => app.log.info(`adaptive-svc listening on ${env.PORT || 3002}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
