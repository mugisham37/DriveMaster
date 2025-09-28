import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { PrismaClient } from '@prisma/client'
import { KnowledgeRepo } from './repo/knowledge'
import { BanditRepo } from './repo/bandit'
import { z } from 'zod'
import { createKafka } from '@drivemaster/kafka-client'
import { thompsonSelect } from './algorithms/mab'

const env = loadEnv(process.env)
startTelemetry('adaptive-svc')

const app = Fastify({ logger: true })
app.register(jwt, { secret: env.JWT_SECRET })

const prisma = new PrismaClient()
const repo = new KnowledgeRepo(prisma)
const bands = new BanditRepo(prisma)
const kafka = createKafka(env.KAFKA_BROKERS.split(','), 'adaptive-svc')
const producer = kafka.producer()
await producer.connect().catch(() => {})

app.get('/health', async () => ({ status: 'ok' }))

app.post('/v1/learning-events', { preHandler: [async (req, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req: any, reply) => {
  const schema = z.object({ conceptId: z.string().min(1), armId: z.string().optional(), correct: z.boolean(), responseTimeMs: z.number().int().positive().optional(), confidence: z.number().min(0).max(1).optional() })
  const { conceptId, armId, correct, responseTimeMs, confidence } = schema.parse(req.body)

  const bktParams = { pL0: 0.2, pT: 0.1, pG: 0.2, pS: 0.1, decay: 0.99 } // TODO: personalize per user/concept
  const next = await repo.applyEvent(req.user.sub, conceptId, bktParams, correct, responseTimeMs, confidence)

  if (armId) await bands.update(req.user.sub, armId, correct)
  return { mastery: next.mastery }
})

app.post('/v1/recommendations/next-question', { preHandler: [async (req, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req: any, reply) => {
  const schema = z.object({ candidateArmIds: z.array(z.string().min(1)).min(1) })
  const { candidateArmIds } = schema.parse(req.body)

  const statsMap = await bands.getStatsMap(req.user.sub, candidateArmIds)
  const arms: Record<string, { alpha: number; beta: number }> = {}
  for (const armId of candidateArmIds) {
    const s = statsMap.get(armId) || { alpha: 1, beta: 1 }
    arms[armId] = s
  }
  const chosen = thompsonSelect(arms)

  const event = {
    type: 'recommendation',
    userId: req.user.sub,
    chosenArmId: chosen,
    candidates: candidateArmIds,
    ts: Date.now(),
  }
  try {
    await producer.send({ topic: 'recommendations.decisions.v1', messages: [{ value: JSON.stringify(event) }] })
  } catch {}

  return { questionId: chosen, rationale: 'thompson_sampling', arms }
})

const port = env.PORT || 3002
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`adaptive-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
