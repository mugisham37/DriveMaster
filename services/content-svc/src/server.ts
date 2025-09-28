import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createES } from '@drivemaster/es-client'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const env = loadEnv(process.env)
startTelemetry('content-svc')

const app = Fastify({ logger: true })
app.register(jwt, { secret: env.JWT_SECRET })

const es = createES(env.ELASTICSEARCH_URL)
const prisma = new PrismaClient()

app.get('/health', async () => ({ status: 'ok' }))

app.post('/v1/content', { preHandler: [async (req, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req, reply) => {
  // TODO: enforce admin role
  const schema = z.object({ slug: z.string().min(1), title: z.string().min(1), body: z.string().min(1), concepts: z.array(z.string()).default([]) })
  const { slug, title, body, concepts } = schema.parse(req.body)

  const content = await prisma.contentItem.create({ data: { slug, title, body, concepts: { create: concepts.map((key) => ({ concept: { connectOrCreate: { where: { key }, create: { key, name: key } } })) } } }, include: { concepts: { include: { concept: true } } } })

  await es.index({ index: 'content-items', id: content.id, document: { id: content.id, slug: content.slug, title: content.title, body: content.body, concepts: content.concepts.map((c) => c.concept.key), version: content.version, variantKey: content.variantKey } })

  return reply.code(201).send({ id: content.id })
})

const port = env.PORT || 3003
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`content-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
