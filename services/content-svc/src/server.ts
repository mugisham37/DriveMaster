import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { eq } from 'drizzle-orm'
import Fastify, { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'

import { db } from './db/connection.js'
import { mediaAssets } from './db/schema.js'
import type { CreateABTestRequest } from './services/ab-testing.service.js'
import { ABTestingService } from './services/ab-testing.service.js'
import { CDNService } from './services/cdn.service.js'
import { ContentAnalyticsService } from './services/content-analytics.service.js'
import { ContentDeliveryService } from './services/content-delivery.service.js'
import { ContentOptimizationService } from './services/content-optimization.service.js'
import { ContentRecommendationService } from './services/content-recommendation.service.js'
import type {
  CreateCategoryRequest,
  CreateConceptRequest,
  CreateItemRequest,
} from './services/content.service.js'
import { ContentService } from './services/content.service.js'
import { ElasticsearchService } from './services/elasticsearch.service.js'
import { OfflineSyncService } from './services/offline-sync.service.js'
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  type AuthenticatedRequest,
  type CategoryQuery,
  type ConceptQuery,
  type ItemQuery,
  type CategoryParams,
  type ConceptParams,
  type ItemParams,
  type ConceptPrerequisiteParams,
  type ConceptPrerequisiteBody,
  type ABTestParams,
  type AnalyticsParams,
  type AnalyticsQuery,
  type MediaParams,
  type MediaOptimizeBody,
  type MediaCompressBody,
  type CDNPurgeBody,
  type CDNAnalyticsQuery,
  type ItemPreloadParams,
  type SyncValidateBody,
  type ResponsiveImageQuery,
  type TrackInteractionBody,
  type SearchQuery,
  type SearchRequest,
  type SyncOptions,
  type OfflineContent,
  type DeviceCapabilities,
  type NetworkConditions,
} from './types/server.js'

const app = Fastify({ logger: true })

// Initialize services
const contentService = new ContentService()

const esService = ((): ElasticsearchService | null => {
  const url = process.env.ELASTICSEARCH_URL
  const username = process.env.ELASTICSEARCH_USERNAME
  const password = process.env.ELASTICSEARCH_PASSWORD

  if (
    url != null &&
    url.trim() !== '' &&
    username != null &&
    username.trim() !== '' &&
    password != null &&
    password.trim() !== ''
  ) {
    return new ElasticsearchService({
      node: url,
      auth: {
        username,
        password,
      },
    })
  }
  return null
})()

const abTestingService = new ABTestingService()
const contentDeliveryService = new ContentDeliveryService()

const cdnService = ((): CDNService => {
  const config = {
    baseUrl: process.env.CDN_BASE_URL ?? 'https://cdn.drivemaster.com',
  } as const

  const apiKey = process.env.CDN_API_KEY
  const zoneId = process.env.CDN_ZONE_ID

  return new CDNService({
    ...config,
    ...(apiKey != null && apiKey.trim() !== '' && { apiKey }),
    ...(zoneId != null && zoneId.trim() !== '' && { zoneId }),
  })
})()

const offlineSyncService = new OfflineSyncService()
const contentAnalyticsService = new ContentAnalyticsService()
const contentRecommendationService = new ContentRecommendationService()
const contentOptimizationService = new ContentOptimizationService()

// Initialize Elasticsearch if available
if (esService != null) {
  void esService.initialize().catch((err: unknown) => {
    app.log.error(
      'Failed to initialize Elasticsearch: %o',
      err instanceof Error ? err : new Error(String(err)),
    )
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
  metadata: z
    .object({
      tags: z.array(z.string()).default([]),
      color: z.string().optional(),
      icon: z.string().optional(),
      description: z.string().optional(),
      learningObjectives: z.array(z.string()).optional(),
    })
    .optional(),
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
  metadata: z
    .object({
      tags: z.array(z.string()).default([]),
      learningGoals: z.array(z.string()).default([]),
      estimatedTime: z.number().optional(),
      prerequisites: z.array(z.string()).optional(),
      difficulty: z.number().optional(),
    })
    .optional(),
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
  options: z.record(z.unknown()).default({}),
  correctAnswer: z.unknown(),
  points: z.number().default(1),
  hints: z.array(z.string()).default([]),
  feedback: z.record(z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  metadata: z
    .object({
      tags: z.array(z.string()).default([]),
      keywords: z.array(z.string()).default([]),
      estimatedTime: z.number().optional(),
      mediaType: z.enum(['text', 'image', 'video', 'interactive']).optional(),
      accessibility: z
        .object({
          altText: z.string().optional(),
          captions: z.boolean().optional(),
          transcript: z.boolean().optional(),
        })
        .optional(),
      lastReviewed: z.string().optional(),
      reviewerNotes: z.string().optional(),
    })
    .optional(),
  abTestVariant: z.string().optional(),
})

const SearchSchema = z.object({
  query: z.string().min(1),
  entityTypes: z.array(z.enum(['item', 'concept', 'category'])).optional(),
  categoryKeys: z.array(z.string()).default([]),
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
      changes: z.record(z.unknown()),
    }),
  ),
  targetConcepts: z.array(z.string()).optional(),
  targetUsers: z.array(z.string()).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
})

const DeviceCapabilitiesSchema = z.object({
  screenWidth: z.number().min(1),
  screenHeight: z.number().min(1),
  pixelDensity: z.number().min(0.5).max(4),
  supportsWebP: z.boolean(),
  supportsAVIF: z.boolean(),
  supportsVideo: z.boolean(),
  maxVideoResolution: z.enum(['480p', '720p', '1080p', '4k']),
  connectionType: z.enum(['slow-2g', '2g', '3g', '4g', '5g', 'wifi']),
  bandwidth: z.number().min(0),
  isLowEndDevice: z.boolean(),
  supportedCodecs: z.array(z.string()),
})

const NetworkConditionsSchema = z.object({
  effectiveType: z.enum(['slow-2g', '2g', '3g', '4g']),
  downlink: z.number().min(0),
  rtt: z.number().min(0),
  saveData: z.boolean(),
})

const ContentDeliveryOptionsSchema = z.object({
  quality: z.enum(['low', 'medium', 'high', 'auto']).default('auto'),
  format: z.enum(['webp', 'avif', 'jpeg', 'png', 'auto']).default('auto'),
  maxWidth: z.number().optional(),
  maxHeight: z.number().optional(),
  progressive: z.boolean().default(true),
  lazy: z.boolean().default(true),
  preload: z.boolean().default(false),
})

const SyncOptionsSchema = z.object({
  categories: z.array(z.string()).optional(),
  concepts: z.array(z.string()).optional(),
  maxSize: z.number().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  includeMedia: z.boolean().default(true),
  compressionLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  networkConditions: NetworkConditionsSchema,
  deviceCapabilities: DeviceCapabilitiesSchema,
})

// Middleware
await app.register(cors, { origin: true, credentials: true })
await app.register(multipart)
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'change_me' })

// Auth middleware
const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify()
  } catch (err) {
    void reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Admin middleware
const requireAdmin = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify()
    const user = (request as AuthenticatedRequest).user
    if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      void reply.code(403).send({ error: 'Insufficient permissions' })
    }
  } catch (err) {
    void reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Error handler
const handleError = (error: unknown, reply: FastifyReply): void => {
  if (error instanceof ValidationError) {
    void reply.code(400).send({ error: 'Validation error', details: error.details })
    return
  }

  if (error instanceof NotFoundError) {
    void reply.code(404).send({ error: error.message })
    return
  }

  if (error instanceof UnauthorizedError) {
    void reply.code(401).send({ error: error.message })
    return
  }

  if (error instanceof ForbiddenError) {
    void reply.code(403).send({ error: error.message })
    return
  }

  if (error instanceof z.ZodError) {
    void reply.code(400).send({ error: 'Validation error', details: error.errors })
    return
  }

  app.log.error(error)
  void reply.code(500).send({ error: 'Internal server error' })
}

// Health check
app.get(
  '/health',
  (): {
    status: string
    timestamp: string
    database: string
    elasticsearch: string
  } => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: 'connected',
    elasticsearch: esService != null ? 'connected' : 'disconnected',
  }),
)

// Categories Management
app.get<{ Querystring: CategoryQuery }>(
  '/categories',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { includeInactive = 'false' } = request.query

      const categories = await contentService.getCategories(includeInactive === 'true')

      void reply.send({ categories })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{ Params: CategoryParams }>(
  '/categories/:key',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { key } = request.params

      const category = await contentService.getCategoryByKey(key)

      if (category == null) {
        throw new NotFoundError('Category not found')
      }

      void reply.send(category)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Body: CreateCategoryRequest }>(
  '/categories',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const data = CategorySchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const category = await contentService.createCategory(data, user.userId)

      // Index to Elasticsearch if available
      if (esService != null && category != null) {
        void esService.indexDocument({
          entityType: 'category',
          entityId: category.id,
          title: category.name,
          content: category.description ?? '',
          keywords: [],
          tags: [],
          status: 'PUBLISHED',
          isActive: category.isActive ?? false,
          createdAt: category.createdAt,
        })
      }

      void reply.code(201).send(category)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Concepts Management
app.get<{ Querystring: ConceptQuery }>(
  '/concepts',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { categoryId, includeInactive = 'false', difficulty } = request.query

      const filters: Parameters<typeof contentService.getConcepts>[0] = {
        includeInactive: includeInactive === 'true',
      }

      if (categoryId != null && categoryId.trim() !== '') {
        filters.categoryId = categoryId
      }

      if (difficulty != null && difficulty.trim() !== '') {
        const parts = difficulty.split(',')
        if (parts.length === 2) {
          const minStr = parts[0]
          const maxStr = parts[1]
          if (minStr != null && maxStr != null) {
            const min = parseFloat(minStr)
            const max = parseFloat(maxStr)
            if (!isNaN(min) && !isNaN(max)) {
              filters.difficulty = { min, max }
            }
          }
        }
      }

      const concepts = await contentService.getConcepts(filters)

      void reply.send({ concepts })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{ Params: ConceptParams }>(
  '/concepts/:key',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { key } = request.params

      const concept = await contentService.getConceptByKey(key)

      if (concept == null) {
        throw new NotFoundError('Concept not found')
      }

      void reply.send(concept)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Body: CreateConceptRequest }>(
  '/concepts',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const data = ConceptSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const concept = await contentService.createConcept(data, user.userId)

      // Index to Elasticsearch if available
      if (esService != null && concept != null) {
        void esService.indexDocument({
          entityType: 'concept',
          entityId: concept.id,
          title: concept.name,
          content: concept.description ?? '',
          keywords: concept.learningGoals ?? [],
          tags: concept.tags ?? [],
          difficulty: concept.difficulty ?? 0.5,
          status: concept.status ?? 'DRAFT',
          isActive: concept.isActive ?? false,
          createdAt: concept.createdAt,
        })
      }

      void reply.code(201).send(concept)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Params: ConceptPrerequisiteParams; Body: ConceptPrerequisiteBody }>(
  '/concepts/:conceptId/prerequisites',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const { conceptId } = request.params
      const { prerequisiteId, weight = 1.0, isRequired = true } = request.body

      if (conceptId == null || conceptId.trim() === '') {
        throw new ValidationError('Concept ID is required')
      }
      if (prerequisiteId == null || prerequisiteId.trim() === '') {
        throw new ValidationError('Prerequisite ID is required')
      }

      const relation = await contentService.addConceptPrerequisite(
        conceptId,
        prerequisiteId,
        weight,
        isRequired,
      )

      void reply.code(201).send(relation)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Items Management
app.get<{ Querystring: ItemQuery }>(
  '/items',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const {
        conceptId,
        categoryId,
        difficulty,
        itemType,
        status = 'PUBLISHED',
        limit = '20',
        offset = '0',
        includeInactive = 'false',
      } = request.query

      const filters: Parameters<typeof contentService.getItems>[0] = {
        includeInactive: includeInactive === 'true',
        status,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      }

      if (conceptId != null && conceptId.trim() !== '') filters.conceptId = conceptId
      if (categoryId != null && categoryId.trim() !== '') filters.categoryId = categoryId
      if (itemType != null && itemType.trim() !== '') filters.itemType = itemType

      if (difficulty != null && difficulty.trim() !== '') {
        const parts = difficulty.split(',')
        if (parts.length === 2) {
          const minStr = parts[0]
          const maxStr = parts[1]
          if (minStr != null && maxStr != null) {
            const min = parseFloat(minStr)
            const max = parseFloat(maxStr)
            if (!isNaN(min) && !isNaN(max)) {
              filters.difficulty = { min, max }
            }
          }
        }
      }

      const result = await contentService.getItems(filters)

      void reply.send(result)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{ Params: ItemParams }>(
  '/items/:slug',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { slug } = request.params
      const user = (request as AuthenticatedRequest).user

      const item = await contentService.getItemBySlug(slug)

      if (item == null) {
        throw new NotFoundError('Item not found')
      }

      // Check if user has access to this item
      if (item.isActive !== true && user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
        throw new NotFoundError('Item not found')
      }

      // Set cache headers
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      reply.header('Cache-Control', 'public, max-age=300')
      if (item.updatedAt != null) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        reply.header('ETag', `"${item.updatedAt.getTime()}"`)
      }

      void reply.send(item)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Body: CreateItemRequest }>(
  '/items',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const data = ItemSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const item = await contentService.createItem(data, user.userId)

      // Index to Elasticsearch if available
      if (esService != null && item != null) {
        void esService.indexDocument({
          entityType: 'item',
          entityId: item.id,
          title: item.title ?? '',
          content: item.body,
          keywords: item.keywords ?? [],
          tags: item.tags ?? [],
          difficulty: item.difficulty ?? 0.5,
          itemType: item.type ?? 'MULTIPLE_CHOICE',
          status: item.status ?? 'DRAFT',
          isActive: item.isActive ?? false,
          successRate: item.successRate ?? 0,
          engagementScore: item.engagementScore ?? 0,
          publishedAt: item.publishedAt,
          createdAt: item.createdAt,
        })
      }

      void reply.code(201).send(item)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Content Search
app.post<{ Body: SearchQuery }>(
  '/search',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const searchParams = SearchSchema.parse(request.body)

      let results

      if (esService != null) {
        // Use Elasticsearch for advanced search
        const searchRequest: SearchRequest = {
          query: searchParams.query,
          categoryKeys: searchParams.categoryKeys,
          conceptKeys: searchParams.conceptKeys,
          difficulty: searchParams.difficulty,
          tags: searchParams.tags,
          itemTypes: searchParams.itemTypes,
          limit: searchParams.limit,
          offset: searchParams.offset,
          sortBy: searchParams.sortBy,
          sortOrder: searchParams.sortOrder,
          entityTypes:
            searchParams.entityTypes?.map((type) =>
              type === 'item'
                ? ('item' as const)
                : type === 'concept'
                  ? ('concept' as const)
                  : ('category' as const),
            ) ?? undefined,
        }
        results = await esService.search(searchRequest)
      } else {
        // Fallback to database search
        results = await contentService.searchContent(searchParams)
      }

      void reply.send(results)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// A/B Testing
app.get(
  '/ab-tests',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const tests = await abTestingService.getActiveTests()

      void reply.send({ tests })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Body: CreateABTestRequest }>(
  '/ab-tests',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const data = ABTestSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const test = await abTestingService.createTest(data, user.userId)

      void reply.code(201).send(test)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Params: ABTestParams }>(
  '/ab-tests/:testId/start',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const { testId } = request.params

      const test = await abTestingService.startTest(testId)

      void reply.send(test)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{ Params: ABTestParams }>(
  '/ab-tests/:testId/results',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const { testId } = request.params

      const results = await abTestingService.getTestResults(testId)

      void reply.send(results)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Analytics endpoints
app.get<{ Params: AnalyticsParams; Querystring: AnalyticsQuery }>(
  '/analytics/:entityType/:entityId',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { entityType, entityId } = request.params
      const { period = 'daily', days = '30' } = request.query

      const analytics = await contentService.getContentAnalytics(
        entityType,
        entityId,
        period,
        parseInt(days, 10),
      )

      void reply.send({ analytics })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Params: AnalyticsParams; Body: Record<string, unknown> }>(
  '/analytics/:entityType/:entityId/track',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { entityType, entityId } = request.params
      const metrics = request.body

      await contentService.trackContentPerformance(entityType, entityId, metrics)

      void reply.send({ success: true })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Multimedia Content Delivery Endpoints
app.post<{ Params: MediaParams; Body: MediaOptimizeBody }>(
  '/media/:mediaAssetId/optimize',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { mediaAssetId } = request.params
      const { deviceCapabilities, networkConditions, options = {} } = request.body

      const validatedDeviceCapabilities = DeviceCapabilitiesSchema.parse(deviceCapabilities)
      const validatedNetworkConditions = NetworkConditionsSchema.parse(networkConditions)
      const validatedOptions = ContentDeliveryOptionsSchema.parse(options)

      const optimizedContent = await contentDeliveryService.getOptimizedContent(
        mediaAssetId,
        validatedDeviceCapabilities,
        validatedNetworkConditions,
        validatedOptions,
      )

      // Set appropriate cache headers
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      reply.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      reply.header('ETag', `"${optimizedContent.cacheKey}"`)

      void reply.send(optimizedContent)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Params: MediaParams; Body: MediaCompressBody }>(
  '/media/:mediaAssetId/compress',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { mediaAssetId } = request.params
      const { targetSize, deviceCapabilities } = request.body

      const validatedDeviceCapabilities = DeviceCapabilitiesSchema.parse(deviceCapabilities)

      const compressedContent = await contentDeliveryService.getCompressedContent(
        mediaAssetId,
        parseInt(targetSize, 10),
        validatedDeviceCapabilities,
      )

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      reply.header('Cache-Control', 'public, max-age=3600')
      void reply.send(compressedContent)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// CDN Management Endpoints
app.post<{ Body: CDNPurgeBody }>(
  '/cdn/purge',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const { urls, tags, hosts, prefixes } = request.body

      const success = await cdnService.purgeCache({
        urls,
        tags,
        hosts,
        prefixes,
      })

      void reply.send({ success })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{ Querystring: CDNAnalyticsQuery }>(
  '/cdn/analytics',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      const { startDate, endDate, granularity = 'day' } = request.query

      const analytics = await cdnService.getCDNAnalytics(
        new Date(startDate),
        new Date(endDate),
        granularity as 'day' | 'hour' | 'week',
      )

      void reply.send({ analytics })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get('/cdn/health', async (request, reply): Promise<void> => {
  try {
    const health = await cdnService.checkCDNHealth()
    void reply.send(health)
  } catch (error) {
    handleError(error, reply)
  }
})

// Content Preloading and Offline Sync Endpoints
app.post<{
  Params: ItemPreloadParams
  Body: { deviceCapabilities: DeviceCapabilities; networkConditions: NetworkConditions }
}>(
  '/items/:itemId/preload-manifest',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { itemId } = request.params
      const { deviceCapabilities, networkConditions } = request.body

      const validatedDeviceCapabilities = DeviceCapabilitiesSchema.parse(deviceCapabilities)
      const validatedNetworkConditions = NetworkConditionsSchema.parse(networkConditions)

      const manifest = await contentDeliveryService.generatePreloadManifest(
        itemId,
        validatedDeviceCapabilities,
        validatedNetworkConditions,
      )

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      reply.header('Cache-Control', 'private, max-age=300')
      void reply.send(manifest)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Body: SyncOptions }>(
  '/sync/manifest',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const syncOptions = SyncOptionsSchema.parse(request.body)

      const manifest = await offlineSyncService.generateSyncManifest(syncOptions)

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      reply.header('Cache-Control', 'private, max-age=300')
      void reply.send(manifest)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.post<{ Body: SyncValidateBody }>(
  '/sync/validate',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { offlineContent } = request.body

      const validation = await offlineSyncService.validateOfflineContent(
        offlineContent as OfflineContent,
      )

      void reply.send(validation)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Responsive Image Generation
app.get<{ Params: MediaParams; Querystring: ResponsiveImageQuery }>(
  '/media/:mediaAssetId/responsive',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { mediaAssetId } = request.params
      const {
        breakpoints = '320,640,768,1024,1280,1920',
        format = 'auto',
        quality = '80',
      } = request.query

      const breakpointArray = breakpoints.split(',').map(Number)

      // Get media asset
      const mediaAsset = await db.query.mediaAssets.findFirst({
        where: eq(mediaAssets.id, mediaAssetId),
      })

      if (mediaAsset == null) {
        throw new NotFoundError('Media asset not found')
      }

      const responsiveSet = cdnService.generateResponsiveImageSet(
        mediaAsset.cdnUrl ?? mediaAsset.storageUrl,
        breakpointArray,
        {
          format: format as 'webp' | 'avif' | 'jpeg' | 'png' | 'auto',
          quality: parseInt(quality, 10),
        },
      )

      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      reply.header('Cache-Control', 'public, max-age=86400')
      void reply.send({ responsiveSet })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Content Analytics and Performance Tracking
app.post<{ Body: TrackInteractionBody }>(
  '/analytics/track-interaction',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const user = (request as AuthenticatedRequest).user
      const interaction = {
        userId: user.userId,
        itemId: request.body.itemId,
        conceptId: request.body.conceptId,
        eventType: request.body.eventType as
          | 'view'
          | 'attempt'
          | 'complete'
          | 'skip'
          | 'hint_used'
          | 'feedback_given',
        isCorrect: request.body.isCorrect,
        responseTime: request.body.responseTime,
        confidence: request.body.confidence,
        hintsUsed: request.body.hintsUsed,
        attemptsCount: request.body.attemptsCount,
        engagementScore: request.body.engagementScore,
        deviceType: request.body.deviceType,
        sessionId: request.body.sessionId,
        timestamp: new Date(),
        metadata: request.body.metadata,
      }

      await contentAnalyticsService.trackUserInteraction(interaction)

      void reply.send({ success: true })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{ Params: { itemId: string }; Querystring: { days?: string } }>(
  '/analytics/content/:itemId/effectiveness',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { itemId } = request.params
      const { days = '30' } = request.query

      const timeRange = {
        start: new Date(Date.now() - parseInt(days, 10) * 24 * 60 * 60 * 1000),
        end: new Date(),
      }

      const effectiveness = await contentAnalyticsService.getContentEffectiveness(itemId, timeRange)

      void reply.send(effectiveness)
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{ Params: { itemId: string }; Querystring: { period?: string; days?: string } }>(
  '/analytics/content/:itemId/trends',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { itemId } = request.params
      const { period = 'daily', days = '30' } = request.query

      const trends = await contentAnalyticsService.getContentPerformanceTrends(
        itemId,
        period as 'daily' | 'weekly' | 'monthly',
        parseInt(days, 10),
      )

      void reply.send({ trends })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{
  Querystring: { conceptId?: string; categoryId?: string; limit?: string; metric?: string }
}>(
  '/analytics/content/top-performing',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { conceptId, categoryId, limit = '10', metric = 'quality_score' } = request.query

      const topContent = await contentAnalyticsService.getTopPerformingContent(
        conceptId,
        categoryId,
        parseInt(limit, 10),
        metric as 'engagement' | 'success_rate' | 'quality_score',
      )

      void reply.send({ topContent })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Content Recommendations
app.get<{
  Querystring: {
    userId: string
    conceptId?: string
    limit?: string
    sessionGoals?: string
    timeAvailable?: string
    deviceType?: string
    previousItems?: string
    targetDifficulty?: string
  }
}>(
  '/recommendations/content',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { userId, conceptId, limit = '10' } = request.query

      const context = {
        userId,
        currentConceptId: conceptId != null && conceptId.trim() !== '' ? conceptId : undefined,
        sessionGoals:
          request.query.sessionGoals != null && request.query.sessionGoals.trim() !== ''
            ? (JSON.parse(request.query.sessionGoals) as string[])
            : undefined,
        timeAvailable:
          request.query.timeAvailable != null && request.query.timeAvailable.trim() !== ''
            ? parseInt(request.query.timeAvailable, 10)
            : undefined,
        deviceType:
          request.query.deviceType != null && request.query.deviceType.trim() !== ''
            ? (request.query.deviceType as 'mobile' | 'tablet' | 'desktop')
            : undefined,
        previousItems:
          request.query.previousItems != null && request.query.previousItems.trim() !== ''
            ? (JSON.parse(request.query.previousItems) as string[])
            : undefined,
        targetDifficulty:
          request.query.targetDifficulty != null && request.query.targetDifficulty.trim() !== ''
            ? parseFloat(request.query.targetDifficulty)
            : undefined,
      }

      const recommendations = await contentRecommendationService.getPersonalizedRecommendations(
        context,
        parseInt(limit, 10),
      )

      void reply.send({ recommendations })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Recommendation feedback route removed - method not implemented in service

// Content Optimization
app.get<{ Params: { itemId: string }; Querystring: { days?: string } }>(
  '/optimization/content/:itemId/suggestions',
  {
    preHandler: [authenticate],
  },
  async (request, reply): Promise<void> => {
    try {
      const { itemId } = request.params

      const report = await contentOptimizationService.generateOptimizationReport(itemId)
      const suggestions = report.suggestions

      void reply.send({ suggestions })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

app.get<{ Querystring: { conceptId?: string; categoryId?: string; limit?: string } }>(
  '/optimization/ab-test-recommendations',
  {
    preHandler: [requireAdmin],
  },
  async (request, reply): Promise<void> => {
    try {
      // TODO: Implement proper A/B test recommendations based on conceptId/categoryId
      const recommendations: unknown[] = []

      void reply.send({ recommendations })
    } catch (error) {
      handleError(error, reply)
    }
  },
)

// Offline Sync Management routes removed - methods not implemented in service

// Start server
const start = async (): Promise<void> => {
  try {
    const port = parseInt(process.env.PORT ?? '3000', 10)
    const host = process.env.HOST ?? '0.0.0.0'

    await app.listen({ port, host })
    app.log.info(`Server listening on ${host}:${port}`)
  } catch (err) {
    app.log.error(err)
    throw new Error('Failed to start server')
  }
}

// Graceful shutdown
process.on('SIGINT', (_signal: string): void => {
  void (async (): Promise<void> => {
    try {
      await app.close()
      app.log.info('Server closed')
      // eslint-disable-next-line no-process-exit
      process.exit(0)
    } catch (err) {
      app.log.error(err)
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }
  })()
})

process.on('SIGTERM', (_signal: string): void => {
  void (async (): Promise<void> => {
    try {
      await app.close()
      app.log.info('Server closed')
      // eslint-disable-next-line no-process-exit
      process.exit(0)
    } catch (err) {
      app.log.error(err)
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }
  })()
})

void start()
