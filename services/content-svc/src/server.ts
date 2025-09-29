import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { PrismaClient } from '@prisma/client'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createEsClient } from '@drivemaster/es-client'
import { createRedisClient } from '@drivemaster/redis-client'
import { createKafka } from '@drivemaster/kafka-client'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import slugify from 'slugify'

initTelemetry('content-svc')
const env = loadEnv()
const app = Fastify({ logger: true })
const prisma = new PrismaClient()
const es = env.ELASTICSEARCH_URL ? createEsClient(env.ELASTICSEARCH_URL) : null
const redis = env.REDIS_URL ? createRedisClient(env.REDIS_URL) : null
const kafka = env.KAFKA_BROKERS ? createKafka({ brokers: env.KAFKA_BROKERS.split(',') }) : null

// Elasticsearch index configuration
const ES_INDEX_NAME = 'drivemaster_content'
const ES_INDEX_MAPPING = {
  mappings: {
    properties: {
      entityType: { type: 'keyword' },
      entityId: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'standard',
        fields: {
          keyword: { type: 'keyword' },
          suggest: { type: 'search_as_you_type' }
        }
      },
      content: {
        type: 'text',
        analyzer: 'standard'
      },
      keywords: { type: 'keyword' },
      tags: { type: 'keyword' },
      categoryKey: { type: 'keyword' },
      conceptKey: { type: 'keyword' },
      difficulty: { type: 'float' },
      successRate: { type: 'float' },
      engagementScore: { type: 'float' },
      itemType: { type: 'keyword' },
      status: { type: 'keyword' },
      isActive: { type: 'boolean' },
      publishedAt: { type: 'date' },
      createdAt: { type: 'date' },
      boost: { type: 'float' },
      quality: { type: 'float' },
      popularity: { type: 'float' }
    }
  },
  settings: {
    analysis: {
      analyzer: {
        content_analyzer: {
          tokenizer: 'standard',
          filter: ['lowercase', 'stop', 'stemmer']
        }
      }
    }
  }
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
  metadata: z.record(z.any()).optional()
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
  metadata: z.record(z.any()).optional()
})

const ItemSchema = z.object({
  title: z.string().optional(),
  body: z.string().min(1),
  explanation: z.string().optional(),
  conceptId: z.string(),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SCENARIO', 'FILL_BLANK', 'MATCHING', 'ORDERING', 'INTERACTIVE']).default('MULTIPLE_CHOICE'),
  difficulty: z.number().min(0).max(1).default(0.5),
  difficultyLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
  estimatedTime: z.number().optional(),
  options: z.record(z.any()).default({}),
  correctAnswer: z.any(),
  points: z.number().default(1),
  hints: z.array(z.string()).default([]),
  feedback: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  abTestVariant: z.string().optional()
})

const SearchSchema = z.object({
  query: z.string().min(1),
  entityTypes: z.array(z.enum(['item', 'concept', 'category'])).optional(),
  categoryKeys: z.array(z.string()).optional(),
  conceptKeys: z.array(z.string()).optional(),
  difficulty: z.object({
    min: z.number().min(0).max(1),
    max: z.number().min(0).max(1)
  }).optional(),
  tags: z.array(z.string()).optional(),
  itemTypes: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['relevance', 'difficulty', 'popularity', 'created', 'updated']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Middleware
await app.register(cors, { origin: true, credentials: true })
await app.register(multipart)
await app.register(jwt, { secret: env.JWT_SECRET || 'change_me' })

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

// Utility functions
async function indexContentToElasticsearch(entityType: string, entityId: string, data: any) {
  if (!es) return
  
  try {
    await es.index({
      index: ES_INDEX_NAME,
      id: `${entityType}_${entityId}`,
      body: {
        entityType,
        entityId,
        ...data,
        updatedAt: new Date().toISOString()
      }
    })
    
    // Update search index record
    await prisma.searchIndex.upsert({
      where: {
        entityType_entityId: {
          entityType,
          entityId
        }
      },
      create: {
        entityType,
        entityId,
        title: data.title || data.name,
        content: data.content || data.body || data.description,
        keywords: data.keywords || [],
        tags: data.tags || [],
        boost: data.boost || 1.0,
        quality: data.quality || 0.5,
        popularity: data.popularity || 0.5,
        isIndexed: true
      },
      update: {
        title: data.title || data.name,
        content: data.content || data.body || data.description,
        keywords: data.keywords || [],
        tags: data.tags || [],
        boost: data.boost || 1.0,
        quality: data.quality || 0.5,
        popularity: data.popularity || 0.5,
        isIndexed: true
      }
    })
    
    app.log.info({ entityType, entityId }, 'Content indexed to Elasticsearch')
  } catch (error) {
    app.log.error({ error, entityType, entityId }, 'Failed to index content')
  }
}

async function removeFromElasticsearch(entityType: string, entityId: string) {
  if (!es) return
  
  try {
    await es.delete({
      index: ES_INDEX_NAME,
      id: `${entityType}_${entityId}`
    })
    
    await prisma.searchIndex.update({
      where: {
        entityType_entityId: {
          entityType,
          entityId
        }
      },
      data: { isIndexed: false }
    })
  } catch (error) {
    app.log.error({ error, entityType, entityId }, 'Failed to remove from Elasticsearch')
  }
}

async function generateUniqueSlug(text: string, existingCheck: (slug: string) => Promise<boolean>): Promise<string> {
  let baseSlug = slugify(text.toLowerCase(), {
    replacement: '-',
    remove: /[*+~.()'";!:@]/g,
    strict: true
  })
  
  let slug = baseSlug
  let counter = 1
  
  while (await existingCheck(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  
  return slug
}

async function publishContentEvent(eventType: string, data: any) {
  if (!kafka) return
  
  const producer = kafka.producer()
  await producer.connect()
  
  await producer.send({
    topic: 'content.events.v1',
    messages: [{
      key: data.id,
      value: JSON.stringify({
        eventType,
        timestamp: new Date().toISOString(),
        data
      })
    }]
  })
  
  await producer.disconnect()
}

// Initialize Elasticsearch index
async function initializeElasticsearch() {
  if (!es) return
  
  try {
    const indexExists = await es.indices.exists({ index: ES_INDEX_NAME })
    
    if (!indexExists) {
      await es.indices.create({
        index: ES_INDEX_NAME,
        body: ES_INDEX_MAPPING
      })
      app.log.info('Elasticsearch index created')
    } else {
      // Update mapping if needed
      await es.indices.putMapping({
        index: ES_INDEX_NAME,
        body: ES_INDEX_MAPPING.mappings
      })
    }
  } catch (error) {
    app.log.error({ error }, 'Failed to initialize Elasticsearch')
  }
}

// Initialize on startup
await initializeElasticsearch()

// Routes
app.get('/health', async () => ({ 
  status: 'ok',
  timestamp: new Date().toISOString(),
  database: 'connected',
  elasticsearch: es ? 'connected' : 'disconnected',
  redis: redis ? 'connected' : 'disconnected',
  kafka: kafka ? 'connected' : 'disconnected'
}))

// Categories Management
app.get('/categories', {
  preHandler: [authenticate]
}, async (request, reply) => {
  try {
    const { includeInactive = false } = request.query as any
    
    const categories = await prisma.category.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        children: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { order: 'asc' }
        },
        concepts: {
          where: includeInactive ? {} : { isActive: true },
          select: {
            id: true,
            key: true,
            name: true,
            difficulty: true,
            totalItems: true
          }
        },
        _count: {
          select: {
            concepts: true,
            children: true
          }
        }
      },
      orderBy: { order: 'asc' }
    })
    
    reply.send({ categories })
  } catch (error) {
    app.log.error(error, 'Get categories error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

app.post('/categories', {
  preHandler: [requireAdmin]
}, async (request, reply) => {
  try {
    const data = CategorySchema.parse(request.body)
    
    // Check if key already exists
    const existing = await prisma.category.findUnique({
      where: { key: data.key }
    })
    
    if (existing) {
      return reply.code(400).send({ error: 'Category key already exists' })
    }
    
    const category = await prisma.category.create({
      data: {
        ...data,
        metadata: data.metadata || {}
      },
      include: {
        parent: true,
        children: true
      }
    })
    
    // Index to Elasticsearch
    await indexContentToElasticsearch('category', category.id, {
      title: category.name,
      content: category.description || '',
      categoryKey: category.key,
      tags: [],
      keywords: [],
      status: 'PUBLISHED',
      isActive: category.isActive,
      createdAt: category.createdAt
    })
    
    // Publish event
    await publishContentEvent('category.created', category)
    
    reply.code(201).send(category)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Create category error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Concepts Management
app.get('/concepts', {
  preHandler: [authenticate]
}, async (request, reply) => {
  try {
    const { categoryId, includeInactive = false, difficulty } = request.query as any
    
    const where: any = includeInactive ? {} : { isActive: true }
    
    if (categoryId) {
      where.categoryId = categoryId
    }
    
    if (difficulty) {
      const [min, max] = difficulty.split(',').map(Number)
      where.difficulty = { gte: min, lte: max }
    }
    
    const concepts = await prisma.concept.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            key: true,
            name: true
          }
        },
        prerequisites: {
          include: {
            prerequisite: {
              select: {
                id: true,
                key: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            items: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    })
    
    reply.send({ concepts })
  } catch (error) {
    app.log.error(error, 'Get concepts error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

app.post('/concepts', {
  preHandler: [requireAdmin]
}, async (request, reply) => {
  try {
    const data = ConceptSchema.parse(request.body)
    
    // Check if key already exists
    const existing = await prisma.concept.findUnique({
      where: { key: data.key }
    })
    
    if (existing) {
      return reply.code(400).send({ error: 'Concept key already exists' })
    }
    
    const concept = await prisma.concept.create({
      data: {
        ...data,
        metadata: data.metadata || {}
      },
      include: {
        category: true
      }
    })
    
    // Index to Elasticsearch
    await indexContentToElasticsearch('concept', concept.id, {
      title: concept.name,
      content: concept.description || '',
      categoryKey: concept.category.key,
      conceptKey: concept.key,
      difficulty: concept.difficulty,
      tags: concept.tags,
      keywords: concept.learningGoals,
      status: concept.status,
      isActive: concept.isActive,
      createdAt: concept.createdAt
    })
    
    // Publish event
    await publishContentEvent('concept.created', concept)
    
    reply.code(201).send(concept)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Create concept error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Items Management
app.get('/items', {
  preHandler: [authenticate]
}, async (request, reply) => {
  try {
    const { 
      conceptId, 
      categoryId, 
      difficulty, 
      itemType, 
      status = 'PUBLISHED', 
      limit = 20, 
      offset = 0,
      includeInactive = false
    } = request.query as any
    
    const where: any = {
      isActive: includeInactive ? undefined : true,
      status: includeInactive ? undefined : status
    }
    
    if (conceptId) {
      where.conceptId = conceptId
    }
    
    if (categoryId) {
      where.concept = {
        categoryId
      }
    }
    
    if (difficulty) {
      const [min, max] = difficulty.split(',').map(Number)
      where.difficulty = { gte: min, lte: max }
    }
    
    if (itemType) {
      where.type = itemType
    }
    
    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          concept: {
            select: {
              id: true,
              key: true,
              name: true,
              category: {
                select: {
                  id: true,
                  key: true,
                  name: true
                }
              }
            }
          },
          mediaAssets: {
            select: {
              id: true,
              filename: true,
              cdnUrl: true,
              type: true,
              alt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.item.count({ where })
    ])
    
    reply.send({ 
      items, 
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    })
  } catch (error) {
    app.log.error(error, 'Get items error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

app.get('/items/:slug', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const { slug } = request.params
    
    const item = await prisma.item.findUnique({
      where: { slug },
      include: {
        concept: {
          include: {
            category: true,
            prerequisites: {
              include: {
                prerequisite: true
              }
            }
          }
        },
        mediaAssets: true,
        versions: {
          select: {
            id: true,
            version: true,
            createdAt: true,
            status: true
          },
          orderBy: {
            version: 'desc'
          }
        }
      }
    })
    
    if (!item) {
      return reply.code(404).send({ error: 'Item not found' })
    }
    
    // Check if user has access to this item
    if (!item.isActive && request.user.role !== 'ADMIN' && request.user.role !== 'INSTRUCTOR') {
      return reply.code(404).send({ error: 'Item not found' })
    }
    
    // Set cache headers
    reply.header('Cache-Control', 'public, max-age=300')
    reply.header('ETag', `"${item.updatedAt.getTime()}"`)
    
    reply.send(item)
  } catch (error) {
    app.log.error(error, 'Get item error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

app.post('/items', {
  preHandler: [requireAdmin]
}, async (request: any, reply) => {
  try {
    const data = ItemSchema.parse(request.body)
    
    // Generate unique slug
    const slug = await generateUniqueSlug(
      data.title || data.body.substring(0, 50),
      async (slug) => {
        const existing = await prisma.item.findUnique({ where: { slug } })
        return !!existing
      }
    )
    
    const item = await prisma.item.create({
      data: {
        ...data,
        slug,
        metadata: data.metadata || {},
        createdBy: request.user.userId
      },
      include: {
        concept: {
          include: {
            category: true
          }
        },
        mediaAssets: true
      }
    })
    
    // Update concept statistics
    await prisma.concept.update({
      where: { id: item.conceptId },
      data: {
        totalItems: { increment: 1 }
      }
    })
    
    // Index to Elasticsearch
    await indexContentToElasticsearch('item', item.id, {
      title: item.title || '',
      content: item.body,
      categoryKey: item.concept.category.key,
      conceptKey: item.concept.key,
      difficulty: item.difficulty,
      itemType: item.type,
      tags: item.tags,
      keywords: item.keywords,
      status: item.status,
      isActive: item.isActive,
      successRate: item.successRate,
      engagementScore: item.engagementScore,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt
    })
    
    // Publish event
    await publishContentEvent('item.created', item)
    
    reply.code(201).send(item)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Create item error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Content Search
app.post('/search', {
  preHandler: [authenticate]
}, async (request, reply) => {
  try {
    const searchParams = SearchSchema.parse(request.body)
    
    if (!es) {
      return reply.code(503).send({ error: 'Search service unavailable' })
    }
    
    // Build Elasticsearch query
    const must: any[] = []
    const filter: any[] = []
    
    // Main search query
    if (searchParams.query) {
      must.push({
        multi_match: {
          query: searchParams.query,
          fields: ['title^3', 'content^2', 'keywords^2', 'tags'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      })
    }
    
    // Filters
    filter.push({ term: { isActive: true } })
    
    if (searchParams.entityTypes) {
      filter.push({ terms: { entityType: searchParams.entityTypes } })
    }
    
    if (searchParams.categoryKeys) {
      filter.push({ terms: { categoryKey: searchParams.categoryKeys } })
    }
    
    if (searchParams.conceptKeys) {
      filter.push({ terms: { conceptKey: searchParams.conceptKeys } })
    }
    
    if (searchParams.difficulty) {
      filter.push({
        range: {
          difficulty: {
            gte: searchParams.difficulty.min,
            lte: searchParams.difficulty.max
          }
        }
      })
    }
    
    if (searchParams.tags) {
      filter.push({ terms: { tags: searchParams.tags } })
    }
    
    if (searchParams.itemTypes) {
      filter.push({ terms: { itemType: searchParams.itemTypes } })
    }
    
    // Sort configuration
    let sort: any[] = []
    
    switch (searchParams.sortBy) {
      case 'relevance':
        sort = [{ _score: { order: searchParams.sortOrder } }]
        break
      case 'difficulty':
        sort = [{ difficulty: { order: searchParams.sortOrder } }]
        break
      case 'popularity':
        sort = [{ popularity: { order: searchParams.sortOrder } }]
        break
      case 'created':
        sort = [{ createdAt: { order: searchParams.sortOrder } }]
        break
      case 'updated':
        sort = [{ updatedAt: { order: searchParams.sortOrder } }]
        break
    }
    
    const searchQuery = {
      index: ES_INDEX_NAME,
      body: {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        sort,
        from: searchParams.offset,
        size: searchParams.limit,
        highlight: {
          fields: {
            title: {},
            content: {
              fragment_size: 150,
              number_of_fragments: 3
            }
          }
        },
        aggs: {
          categories: {
            terms: { field: 'categoryKey', size: 10 }
          },
          concepts: {
            terms: { field: 'conceptKey', size: 20 }
          },
          itemTypes: {
            terms: { field: 'itemType', size: 10 }
          },
          difficultyRange: {
            histogram: {
              field: 'difficulty',
              interval: 0.1
            }
          }
        }
      }
    }
    
    const response = await es.search(searchQuery)
    
    const results = {
      hits: response.body.hits.hits.map((hit: any) => ({
        id: hit._source.entityId,
        type: hit._source.entityType,
        score: hit._score,
        source: hit._source,
        highlight: hit.highlight
      })),
      total: response.body.hits.total.value,
      aggregations: response.body.aggregations,
      took: response.body.took
    }
    
    reply.send(results)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Search error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// A/B Testing
app.get('/ab-tests', {
  preHandler: [requireAdmin]
}, async (request, reply) => {
  try {
    const tests = await prisma.abTest.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    reply.send({ tests })
  } catch (error) {
    app.log.error(error, 'Get A/B tests error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Analytics endpoints
app.get('/analytics/:entityType/:entityId', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const { entityType, entityId } = request.params
    const { period = 'daily', days = 30 } = request.query
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
    
    const analytics = await prisma.contentAnalytics.findMany({
      where: {
        entityType,
        entityId,
        period,
        periodStart: {
          gte: startDate
        }
      },
      orderBy: {
        periodStart: 'asc'
      }
    })
    
    reply.send({ analytics })
  } catch (error) {
    app.log.error(error, 'Get analytics error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Graceful shutdown
process.on('SIGINT', async () => {
  app.log.info('Shutting down gracefully...')
  await prisma.$disconnect()
  if (redis) await redis.disconnect()
  process.exit(0)
})

app.listen({ port: env.PORT || 3003, host: '0.0.0.0' })
  .then(() => app.log.info(`content-svc listening on ${env.PORT || 3003}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
