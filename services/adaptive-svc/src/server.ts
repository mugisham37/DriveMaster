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
import { createES } from '@drivemaster/es-client'
import { fetchCandidateArmIds, fetchCandidateDetails } from './repo/candidates'

const env = loadEnv(process.env)
startTelemetry('adaptive-svc')

const app = Fastify({ logger: true })
app.register(jwt, { secret: env.JWT_SECRET })

const prisma = new PrismaClient()
const repo = new KnowledgeRepo(prisma)
const bands = new BanditRepo(prisma)
const es = createES(env.ELASTICSEARCH_URL)
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
  const schema = z.object({ candidateArmIds: z.array(z.string().min(1)).optional(), conceptId: z.string().optional(), size: z.number().int().min(1).max(50).default(20) }).refine((v) => !!v.candidateArmIds || !!v.conceptId, 'Provide candidateArmIds or conceptId')
  const { candidateArmIds: given, conceptId, size } = schema.parse(req.body)

  const candidateArmIds = given ?? (conceptId ? await (async () => {
    // get mastery for concept
    const rec = await prisma.userKnowledgeState.findUnique({ where: { userId_conceptId: { userId: req.user.sub, conceptId } } })
    const mastery = rec ? rec.mastery : 0.2
    return fetchCandidateArmIds(es as any, conceptId, mastery, size)
  })() : [])

  const statsMap = await bands.getStatsMap(req.user.sub, candidateArmIds)
  const arms: Record<string, { alpha: number; beta: number }> = {}
  for (const armId of candidateArmIds) {
    const s = statsMap.get(armId) || { alpha: 1, beta: 1 }
    arms[armId] = s
  }

  // Compute IRT-based information score
  const details = await fetchCandidateDetails(es as any, candidateArmIds)
  const masteryRec = conceptId ? await prisma.userKnowledgeState.findUnique({ where: { userId_conceptId: { userId: req.user.sub, conceptId } } }) : null
  const m = masteryRec ? Math.min(0.99, Math.max(0.01, masteryRec.mastery)) : 0.5
  const theta = Math.log(m / (1 - m)) // simple logit mapping

  const info: Record<string, number> = {}
  for (const d of details) {
    const a = d.irtA ?? 1
    const b = d.irtB ?? 0
    const c = d.irtC ?? 0.2
    // approximate information ~ a^2 * P(1-P)
    const exp = Math.exp(-a * (theta - b))
    const P = c + (1 - c) / (1 + exp)
    info[d.id] = a * a * (P * (1 - P))
  }
  // normalize info
  const maxInfo = Math.max(1e-9, ...Object.values(info))
  for (const k of Object.keys(info)) info[k] = info[k] / maxInfo

  // blend Thompson expected value (deterministic sample placeholder) with info
  const W = 0.6
  let best = { arm: candidateArmIds[0], score: -1 }
  for (const id of candidateArmIds) {
    const bandit = arms[id] ? arms[id].alpha / (arms[id].alpha + arms[id].beta) : 0.5
    const score = W * bandit + (1 - W) * (info[id] ?? 0)
    if (score > best.score) best = { arm: id, score }
  }
  const chosen = best.arm

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
