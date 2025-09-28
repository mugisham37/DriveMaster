import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { startTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createES } from '@drivemaster/es-client'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import crypto from 'crypto'
import { ensureContentIndex } from './es/index'

const env = loadEnv(process.env)
startTelemetry('content-svc')

const app = Fastify({ logger: true })
app.register(jwt, { secret: env.JWT_SECRET })

const es = createES(env.ELASTICSEARCH_URL)
const prisma = new PrismaClient()

// fire-and-forget index ensuring
ensureContentIndex(es).catch((e) => app.log.error({ err: e }, 'ensureContentIndex error'))

app.get('/health', async () => ({ status: 'ok' }))

app.post('/v1/content', { preHandler: [async (req: any, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req: any, reply) => {
  // Enforce admin role
  if (!req.user?.roles?.includes('admin')) return reply.code(403).send({ error: 'Forbidden' })
  const schema = z.object({ slug: z.string().min(1), title: z.string().min(1), body: z.string().min(1), difficulty: z.number().min(0).max(1).default(0.5), concepts: z.array(z.string()).default([]) })
  const { slug, title, body, difficulty, concepts } = schema.parse(req.body)

  const content = await prisma.contentItem.create({ data: { slug, title, body, difficulty, concepts: { create: concepts.map((key) => ({ concept: { connectOrCreate: { where: { key }, create: { key, name: key } } })) } } }, include: { concepts: { include: { concept: true } } } })

  await es.index({ index: 'content-items', id: content.id, document: { id: content.id, slug: content.slug, title: content.title, body: content.body, concepts: content.concepts.map((c) => c.concept.key), difficulty: content.difficulty, version: content.version, variantKey: content.variantKey, updatedAt: content.updatedAt } })

  return reply.code(201).send({ id: content.id })
})

app.get('/v1/content/:slug', async (req, reply) => {
  const schema = z.object({ slug: z.string().min(1) })
  const { slug } = schema.parse(req.params as any)

  const content = await prisma.contentItem.findUnique({ where: { slug }, include: { concepts: { include: { concept: true } }, variants: true } })
  if (!content) return reply.code(404).send({ error: 'Not found' })
  const payload = { id: content.id, slug: content.slug, title: content.title, body: content.body, concepts: content.concepts.map((c) => c.concept.key), difficulty: content.difficulty, version: content.version, variantKey: content.variantKey, updatedAt: content.updatedAt }

  const etag = crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex')
  if ((req.headers['if-none-match'] || '') === etag) return reply.code(304).send()

  reply.header('ETag', etag)
  reply.header('Cache-Control', 'public, max-age=60')
  return payload
})

app.get('/v1/content', async (req, reply) => {
  const schema = z.object({ q: z.string().min(1) })
  const { q } = schema.parse(req.query as any)
  const result = await es.search({ index: 'content-items', query: { multi_match: { query: q, fields: ['title^2', 'body'] } }, size: 10 } as any)
  const hits = (result.hits.hits as any[]).map((h) => ({ id: h._id, ...(h._source || {}) }))
  reply.header('Cache-Control', 'public, max-age=30')
  return { hits }
})

app.put('/v1/content/:id', { preHandler: [async (req: any, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req: any, reply) => {
  if (!req.user?.roles?.includes('admin')) return reply.code(403).send({ error: 'Forbidden' })
  const schema = z.object({ id: z.string().min(1) })
  const bodySchema = z.object({ title: z.string().min(1).optional(), body: z.string().min(1).optional(), variantKey: z.string().optional() })
  const { id } = schema.parse(req.params)
  const { title, body, variantKey } = bodySchema.parse(req.body)

  const content = await prisma.contentItem.update({ where: { id }, data: { title, body, variantKey } })
  await es.index({ index: 'content-items', id: content.id, document: { id: content.id, slug: content.slug, title: content.title, body: content.body, difficulty: content.difficulty, version: content.version, variantKey: content.variantKey, updatedAt: content.updatedAt } })
  return reply.code(204).send()
})

app.delete('/v1/content/:id', { preHandler: [async (req: any, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req: any, reply) => {
  if (!req.user?.roles?.includes('admin')) return reply.code(403).send({ error: 'Forbidden' })
  const schema = z.object({ id: z.string().min(1) })
  const { id } = schema.parse(req.params)

  await prisma.$transaction([
    prisma.contentVariant.deleteMany({ where: { contentId: id } }),
    prisma.contentConcept.deleteMany({ where: { contentId: id } }),
    prisma.contentItem.delete({ where: { id } }),
  ])
  try { await es.delete({ index: 'content-items', id }) } catch {}
  return reply.code(204).send()
})

const port = env.PORT || 3003
app
  .listen({ host: '0.0.0.0', port })
  .then(() => app.log.info(`content-svc listening on ${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
