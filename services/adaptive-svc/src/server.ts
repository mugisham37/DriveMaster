import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { PrismaClient } from '@prisma/client'
import { KnowledgeRepo } from './repo/knowledge'
import { z } from 'zod'

const env = loadEnv(process.env)
startTelemetry('adaptive-svc')

const app = Fastify({ logger: true })
app.register(jwt, { secret: env.JWT_SECRET })

const prisma = new PrismaClient()
const repo = new KnowledgeRepo(prisma)

app.get('/health', async () => ({ status: 'ok' }))

app.post('/v1/learning-events', { preHandler: [async (req, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req: any, reply) => {
  const schema = z.object({ conceptId: z.string().min(1), correct: z.boolean(), responseTimeMs: z.number().int().positive().optional(), confidence: z.number().min(0).max(1).optional() })
  const { conceptId, correct, responseTimeMs, confidence } = schema.parse(req.body)

  const bktParams = { pL0: 0.2, pT: 0.1, pG: 0.2, pS: 0.1, decay: 0.99 } // TODO: personalize per user/concept
  const next = await repo.applyEvent(req.user.sub, conceptId, bktParams, correct, responseTimeMs, confidence)
  return { mastery: next.mastery }
})

app.post('/v1/recommendations/next-question', { preHandler: [async (req, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req, reply) => {
  // TODO: wire knowledge state + Thompson Sampling for question selection
  return { questionId: 'placeholder', rationale: 'thompson_sampling_placeholder' }
})

const port = env.PORT || 3002
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`adaptive-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
