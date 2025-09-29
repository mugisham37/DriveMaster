import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { z } from 'zod'
import { db } from './db/connection.js'
import { ContentService } from './services/content.service.js'
import { ElasticsearchService } from './services/elasticsearch.service.js'
import { ABTestingService } from './services/ab-testing.service.js'

const app = Fastify({ logger: true })

// Initialize services
const contentService = new ContentService()
const esService = process.env.ELASTICSEARCH_URL
  ? new ElasticsearchService({
      node: process.env.ELASTICSEARCH_URL,
      auth: process.env.ELASTICSEARCH_USERNAME
        ? {
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD || '',
          }
        : undefined,
    })
  : null
const abTestingService = new ABTestingService()

// Initialize Elasticsearch if available
if (esService) {
  esService.initialize().catch((err) => {
    app.log.error('Failed to initialize Elasticsearch:', err)
  })
}

// Validation schemas
const CategorySchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  parentId: z.string().optional(),
  order: z.number().default(0),
  metadata: z.record(z.any()).optional(),
})

const ConceptSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string(),
  learningGoals: z.array(z.string()).default([]),
  difficulty: z.number().min(0).max(1).default(0.5),
  estimatedTime: z.number().optional(),
  order: z.number().default(0),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
})

const ItemSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
  explanation: z.string().optional(),
  conceptId: z.string(),
  type: z
    .enum([
      'MULTIPLE_CHOICE',
      'TRUE_FALSE',
      'SCENARIO',
      'FILL_BLANK',
      'MATCHING',
      'ORDERING',
      'INTERACTIVE',
    ])
    .default('MULTIPLE_CHOICE'),
  difficulty: z.number().min(0).max(1).default(0.5),
  difficultyLevel: z
    .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'])
    .default('INTERMEDIATE'),
  estimatedTime: z.number().optional(),
  options: z.record(z.any()).default({}),
  correctAnswer: z.any(),
  points: z.number().default(1),
  hints: z.array(z.string()).default([]),
  feedback: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  abTestVariant: z.string().optional(),
})

const SearchSchema = z.object({
  query: z.string().min(1),
  entityTypes: z.array(z.enum(['item', 'concept', 'category'])).optional(),
  categoryKeys: z.array(z.string()).optional(),
  conceptKeys: z.array(z.string()).optional(),
  difficulty: z
    .object({
      min: z.number().min(0).max(1),
      max: z.number().min(0).max(1),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  itemTypes: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z
    .enum(['relevance', 'difficulty', 'popularity', 'created', 'updated'])
    .default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

const ABTestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hypothesis: z.string().min(1),
  variants: z.record(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      trafficPercentage: z.number().min(0).max(100),
      changes: z.any(),
    }),
  ),
  targetConcepts: z.array(z.string()).optional(),
  targetUsers: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

// Middleware
await app.register(cors, { origin: true, credentials: true })
await app.register(multipart)
await app.register(jwt, { secret: process.env.JWT_SECRET || 'change_me' })

// Auth middleware
async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Admin middleware
async function requireAdmin(request: any, reply: any) {
  try {
    await request.jwtVerify()
    if (request.user.role !== 'ADMIN' && request.user.role !== 'INSTRUCTOR') {
      reply.code(403).send({ error: 'Insufficient permissions' })
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Health check
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  database: 'connected',
  elasticsearch: esService ? 'connected' : 'disconnected',
}))

// Categories Management
app.get(
  '/categories',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const { includeInactive = false } = request.query as any

      const categories = await contentService.getCategories(includeInactive)

      reply.send({ categories })
    } catch (error) {
      app.log.error(error, 'Get categories error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.get(
  '/categories/:key',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const { key } = request.params

      const category = await contentService.getCategoryByKey(key)

      if (!category) {
        return reply.code(404).send({ error: 'Category not found' })
      }

      reply.send(category)
    } catch (error) {
      app.log.error(error, 'Get category error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.post(
  '/categories',
  {
    preHandler: [requireAdmin],
  },
  async (request: any, reply) => {
    try {
      const data = CategorySchema.parse(request.body)

      const category = await contentService.createCategory(data, request.user?.userId)

      // Index to Elasticsearch if available
      if (esService && category) {
        await esService.indexDocument({
          entityType: 'category',
          entityId: category.id,
          title: category.name,
          content: category.description || '',
          keywords: [],
          tags: [],
          status: 'PUBLISHED',
          isActive: category.isActive || false,
          createdAt: category.createdAt,
        })
      }

      reply.code(201).send(category)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      if (error.message === 'Category key already exists') {
        return reply.code(400).send({ error: error.message })
      }

      app.log.error(error, 'Create category error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Concepts Management
app.get(
  '/concepts',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const { categoryId, includeInactive = false, difficulty } = request.query as any

      const filters: any = { includeInactive }

      if (categoryId) {
        filters.categoryId = categoryId
      }

      if (difficulty) {
        const [min, max] = difficulty.split(',').map(Number)
        filters.difficulty = { min, max }
      }

      const concepts = await contentService.getConcepts(filters)

      reply.send({ concepts })
    } catch (error) {
      app.log.error(error, 'Get concepts error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.get(
  '/concepts/:key',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const { key } = request.params

      const concept = await contentService.getConceptByKey(key)

      if (!concept) {
        return reply.code(404).send({ error: 'Concept not found' })
      }

      reply.send(concept)
    } catch (error) {
      app.log.error(error, 'Get concept error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.post(
  '/concepts',
  {
    preHandler: [requireAdmin],
  },
  async (request: any, reply) => {
    try {
      const data = ConceptSchema.parse(request.body)

      const concept = await contentService.createConcept(data, request.user?.userId)

      // Index to Elasticsearch if available
      if (esService && concept) {
        await esService.indexDocument({
          entityType: 'concept',
          entityId: concept.id,
          title: concept.name,
          content: concept.description || '',
          keywords: concept.learningGoals || [],
          tags: concept.tags || [],
          difficulty: concept.difficulty || 0.5,
          status: concept.status || 'DRAFT',
          isActive: concept.isActive || false,
          createdAt: concept.createdAt,
        })
      }

      reply.code(201).send(concept)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      if (
        error.message === 'Concept key already exists' ||
        error.message === 'Category not found'
      ) {
        return reply.code(400).send({ error: error.message })
      }

      app.log.error(error, 'Create concept error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.post(
  '/concepts/:conceptId/prerequisites',
  {
    preHandler: [requireAdmin],
  },
  async (request: any, reply) => {
    try {
      const { conceptId } = request.params
      const { prerequisiteId, weight = 1.0, isRequired = true } = request.body

      const relation = await contentService.addConceptPrerequisite(
        conceptId,
        prerequisiteId,
        weight,
        isRequired,
      )

      reply.code(201).send(relation)
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Circular dependency')) {
        return reply.code(400).send({ error: error.message })
      }

      app.log.error(error, 'Add prerequisite error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Items Management
app.get(
  '/items',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const {
        conceptId,
        categoryId,
        difficulty,
        itemType,
        status = 'PUBLISHED',
        limit = 20,
        offset = 0,
        includeInactive = false,
      } = request.query as any

      const filters: any = {
        includeInactive,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
      }

      if (conceptId) filters.conceptId = conceptId
      if (categoryId) filters.categoryId = categoryId
      if (itemType) filters.itemType = itemType

      if (difficulty) {
        const [min, max] = difficulty.split(',').map(Number)
        filters.difficulty = { min, max }
      }

      const result = await contentService.getItems(filters)

      reply.send(result)
    } catch (error) {
      app.log.error(error, 'Get items error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.get(
  '/items/:slug',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const { slug } = request.params

      const item = await contentService.getItemBySlug(slug)

      if (!item) {
        return reply.code(404).send({ error: 'Item not found' })
      }

      // Check if user has access to this item
      if (!item.isActive && request.user.role !== 'ADMIN' && request.user.role !== 'INSTRUCTOR') {
        return reply.code(404).send({ error: 'Item not found' })
      }

      // Set cache headers
      reply.header('Cache-Control', 'public, max-age=300')
      if (item.updatedAt) {
        reply.header('ETag', `"${item.updatedAt.getTime()}"`)
      }

      reply.send(item)
    } catch (error) {
      app.log.error(error, 'Get item error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.post(
  '/items',
  {
    preHandler: [requireAdmin],
  },
  async (request: any, reply) => {
    try {
      const data = ItemSchema.parse(request.body)

      const item = await contentService.createItem(data, request.user?.userId)

      // Index to Elasticsearch if available
      if (esService && item) {
        await esService.indexDocument({
          entityType: 'item',
          entityId: item.id,
          title: item.title || '',
          content: item.body,
          keywords: item.keywords || [],
          tags: item.tags || [],
          difficulty: item.difficulty || 0.5,
          itemType: item.type || 'MULTIPLE_CHOICE',
          status: item.status || 'DRAFT',
          isActive: item.isActive || false,
          successRate: item.successRate || 0,
          engagementScore: item.engagementScore || 0,
          publishedAt: item.publishedAt,
          createdAt: item.createdAt,
        })
      }

      reply.code(201).send(item)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      if (error.message === 'Concept not found') {
        return reply.code(400).send({ error: error.message })
      }

      app.log.error(error, 'Create item error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Content Search
app.post(
  '/search',
  {
    preHandler: [authenticate],
  },
  async (request, reply) => {
    try {
      const searchParams = SearchSchema.parse(request.body)

      let results

      if (esService) {
        // Use Elasticsearch for advanced search
        results = await esService.search({
          ...searchParams,
          entityTypes: searchParams.entityTypes?.map(String),
        })
      } else {
        // Fallback to database search
        results = await contentService.searchContent(searchParams)
      }

      reply.send(results)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      app.log.error(error, 'Search error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// A/B Testing
app.get(
  '/ab-tests',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply) => {
    try {
      const tests = await abTestingService.getActiveTests()

      reply.send({ tests })
    } catch (error) {
      app.log.error(error, 'Get A/B tests error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.post(
  '/ab-tests',
  {
    preHandler: [requireAdmin],
  },
  async (request: any, reply) => {
    try {
      const data = ABTestSchema.parse(request.body)

      const test = await abTestingService.createTest(
        {
          ...data,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
        request.user?.userId,
      )

      reply.code(201).send(test)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({ error: 'Validation error', details: error.errors })
      }

      if (error.message.includes('Traffic split')) {
        return reply.code(400).send({ error: error.message })
      }

      app.log.error(error, 'Create A/B test error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.post(
  '/ab-tests/:testId/start',
  {
    preHandler: [requireAdmin],
  },
  async (request: any, reply) => {
    try {
      const { testId } = request.params

      const test = await abTestingService.startTest(testId)

      reply.send(test)
    } catch (error: any) {
      if (error.message === 'Test not found') {
        return reply.code(404).send({ error: error.message })
      }

      app.log.error(error, 'Start A/B test error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.get(
  '/ab-tests/:testId/results',
  {
    preHandler: [requireAdmin],
  },
  async (request: any, reply) => {
    try {
      const { testId } = request.params

      const results = await abTestingService.getTestResults(testId)

      reply.send(results)
    } catch (error: any) {
      if (error.message === 'Test not found') {
        return reply.code(404).send({ error: error.message })
      }

      app.log.error(error, 'Get A/B test results error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Analytics endpoints
app.get(
  '/analytics/:entityType/:entityId',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const { entityType, entityId } = request.params
      const { period = 'daily', days = 30 } = request.query

      const analytics = await contentService.getContentAnalytics(
        entityType,
        entityId,
        period,
        parseInt(days),
      )

      reply.send({ analytics })
    } catch (error) {
      app.log.error(error, 'Get analytics error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

app.post(
  '/analytics/:entityType/:entityId/track',
  {
    preHandler: [authenticate],
  },
  async (request: any, reply) => {
    try {
      const { entityType, entityId } = request.params
      const metrics = request.body

      await contentService.trackContentPerformance(entityType, entityId, metrics)

      reply.send({ success: true })
    } catch (error) {
      app.log.error(error, 'Track analytics error')
      reply.code(500).send({ error: 'Internal server error' })
    }
  },
)

// Graceful shutdown
process.on('SIGINT', async () => {
  app.log.info('Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  app.log.info('Shutting down gracefully...')
  process.exit(0)
})

app
  .listen({ port: parseInt(process.env.PORT || '3003'), host: '0.0.0.0' })
  .then(() => app.log.info(`content-svc listening on ${process.env.PORT || 3003}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
