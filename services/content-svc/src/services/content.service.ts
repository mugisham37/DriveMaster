import { eq, and, desc, asc, sql, inArray, gte, lte, count } from 'drizzle-orm'
import slugify from 'slugify'

import {
  db,
  categories,
  concepts,
  items,
  conceptPrerequisites,
  searchIndex,
  contentAnalytics,
} from '../db/connection.js'
import type { CategoryMetadata, ConceptMetadata, ItemMetadata } from '../db/schema.js'

export interface CreateCategoryRequest {
  key: string
  name: string
  description?: string
  icon?: string
  color?: string
  parentId?: string
  order?: number
  metadata?: CategoryMetadata
}

export interface CreateConceptRequest {
  key: string
  name: string
  description?: string
  categoryId: string
  learningGoals?: string[]
  difficulty?: number
  estimatedTime?: number
  order?: number
  tags?: string[]
  metadata?: ConceptMetadata
}

export interface CreateItemRequest {
  title?: string
  body: string
  explanation?: string
  conceptId: string
  type?:
    | 'MULTIPLE_CHOICE'
    | 'TRUE_FALSE'
    | 'SCENARIO'
    | 'FILL_BLANK'
    | 'MATCHING'
    | 'ORDERING'
    | 'INTERACTIVE'
  difficulty?: number
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  estimatedTime?: number
  options?: Record<string, unknown>
  correctAnswer?: unknown
  points?: number
  hints?: string[]
  feedback?: Record<string, unknown>
  tags?: string[]
  keywords?: string[]
  metadata?: ItemMetadata
  abTestVariant?: string
}

export interface SearchRequest {
  query: string
  entityTypes?: ('item' | 'concept' | 'category')[]
  categoryKeys?: string[]
  conceptKeys?: string[]
  difficulty?: { min: number; max: number }
  tags?: string[]
  itemTypes?: string[]
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'difficulty' | 'popularity' | 'created' | 'updated'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchHit {
  id: string
  type: string
  source: {
    title: string
    content: string
    keywords: string[]
    tags: string[]
    boost?: number | null
    quality?: number | null
    popularity?: number | null
  }
}

export interface SearchResponse {
  hits: SearchHit[]
  total: number
}

export class ContentService {
  // Category Management
  async createCategory(
    data: CreateCategoryRequest,
    _createdBy?: string,
  ): Promise<typeof categories.$inferSelect> {
    // Check if key already exists
    const existing = await db.select().from(categories).where(eq(categories.key, data.key)).limit(1)
    if (existing.length > 0) {
      throw new Error('Category key already exists')
    }

    // Validate parent exists if provided
    if (data.parentId != null && data.parentId.trim() !== '') {
      const parent = await db
        .select()
        .from(categories)
        .where(eq(categories.id, data.parentId))
        .limit(1)
      if (parent.length === 0) {
        throw new Error('Parent category not found')
      }
    }

    const [category] = await db
      .insert(categories)
      .values({
        key: data.key,
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        parentId: data.parentId ?? null,
        order: data.order ?? 0,
        metadata: data.metadata ?? ({} as CategoryMetadata),
      })
      .returning()

    if (!category) {
      throw new Error('Failed to create category')
    }

    // Index for search
    await this.indexContentForSearch('category', category.id, {
      title: category.name,
      content: category.description ?? '',
      keywords: [],
      tags: [],
    })

    return category
  }

  async getCategories(
    includeInactive = false,
  ): Promise<Awaited<ReturnType<typeof db.query.categories.findMany>>> {
    const whereClause = includeInactive ? undefined : eq(categories.isActive, true)

    return await db.query.categories.findMany({
      where: whereClause,
      with: {
        children: {
          where: includeInactive ? undefined : eq(categories.isActive, true),
          orderBy: [asc(categories.order)],
        },
        concepts: {
          where: includeInactive ? undefined : eq(concepts.isActive, true),
          columns: {
            id: true,
            key: true,
            name: true,
            difficulty: true,
            totalItems: true,
          },
        },
      },
      orderBy: [asc(categories.order)],
    })
  }

  async getCategoryByKey(
    key: string,
  ): Promise<Awaited<ReturnType<typeof db.query.categories.findFirst>> | undefined> {
    return await db.query.categories.findFirst({
      where: eq(categories.key, key),
      with: {
        parent: true,
        children: {
          where: eq(categories.isActive, true),
          orderBy: [asc(categories.order)],
        },
        concepts: {
          where: eq(concepts.isActive, true),
          orderBy: [asc(concepts.order)],
        },
      },
    })
  }

  // Concept Management
  async createConcept(
    data: CreateConceptRequest,
    createdBy?: string,
  ): Promise<typeof concepts.$inferSelect> {
    // Check if key already exists
    const existing = await db.select().from(concepts).where(eq(concepts.key, data.key)).limit(1)
    if (existing.length > 0) {
      throw new Error('Concept key already exists')
    }

    // Validate category exists
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, data.categoryId))
      .limit(1)
    if (category.length === 0) {
      throw new Error('Category not found')
    }

    const [concept] = await db
      .insert(concepts)
      .values({
        key: data.key,
        name: data.name,
        description: data.description ?? null,
        categoryId: data.categoryId,
        learningGoals: data.learningGoals ?? [],
        difficulty: data.difficulty ?? 0.5,
        estimatedTime: data.estimatedTime ?? null,
        order: data.order ?? 0,
        tags: data.tags ?? [],
        metadata: data.metadata ?? ({} as ConceptMetadata),
        createdBy: createdBy ?? null,
      })
      .returning()

    if (!concept) {
      throw new Error('Failed to create concept')
    }

    // Index for search
    await this.indexContentForSearch('concept', concept.id, {
      title: concept.name,
      content: concept.description ?? '',
      keywords: concept.learningGoals ?? [],
      tags: concept.tags ?? [],
    })

    return concept
  }

  async getConcepts(
    filters: {
      categoryId?: string
      includeInactive?: boolean
      difficulty?: { min: number; max: number }
    } = {},
  ): Promise<Awaited<ReturnType<typeof db.query.concepts.findMany>>> {
    const whereConditions = []

    if (filters.includeInactive !== true) {
      whereConditions.push(eq(concepts.isActive, true))
    }

    if (filters.categoryId != null && filters.categoryId.trim() !== '') {
      whereConditions.push(eq(concepts.categoryId, filters.categoryId))
    }

    if (filters.difficulty) {
      whereConditions.push(
        and(
          gte(concepts.difficulty, filters.difficulty.min),
          lte(concepts.difficulty, filters.difficulty.max),
        ),
      )
    }

    return await db.query.concepts.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        category: {
          columns: {
            id: true,
            key: true,
            name: true,
          },
        },
        prerequisites: {
          with: {
            prerequisite: {
              columns: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [asc(concepts.order), asc(concepts.name)],
    })
  }

  async getConceptByKey(
    key: string,
  ): Promise<Awaited<ReturnType<typeof db.query.concepts.findFirst>> | undefined> {
    return await db.query.concepts.findFirst({
      where: eq(concepts.key, key),
      with: {
        category: true,
        prerequisites: {
          with: {
            prerequisite: true,
          },
        },
        items: {
          where: eq(items.isActive, true),
          columns: {
            id: true,
            slug: true,
            title: true,
            type: true,
            difficulty: true,
            successRate: true,
          },
        },
      },
    })
  }

  // cSpell:ignore prereq
  async addConceptPrerequisite(
    conceptId: string,
    prerequisiteId: string,
    weight = 1.0,
    isRequired = true,
  ): Promise<typeof conceptPrerequisites.$inferSelect> {
    // Validate both concepts exist
    const [concept, prerequisite] = await Promise.all([
      db.select().from(concepts).where(eq(concepts.id, conceptId)).limit(1),
      db.select().from(concepts).where(eq(concepts.id, prerequisiteId)).limit(1),
    ])

    if (concept.length === 0 || prerequisite.length === 0) {
      throw new Error('Concept or prerequisite not found')
    }

    // Check for circular dependencies
    const hasCircularDependency = await this.checkCircularDependency(conceptId, prerequisiteId)
    if (hasCircularDependency) {
      throw new Error('Circular dependency detected')
    }

    const [relation] = await db
      .insert(conceptPrerequisites)
      .values({
        conceptId,
        prerequisiteId,
        weight,
        isRequired,
      })
      .returning()

    if (!relation) {
      throw new Error('Failed to create concept prerequisite')
    }

    return relation
  }

  private async checkCircularDependency(
    conceptId: string,
    prerequisiteId: string,
  ): Promise<boolean> {
    // Simple check: if prerequisiteId has conceptId as a prerequisite (direct or indirect)
    const prerequisites = await db
      .select()
      .from(conceptPrerequisites)
      .where(eq(conceptPrerequisites.conceptId, prerequisiteId))

    for (const prereq of prerequisites) {
      if (prereq.prerequisiteId === conceptId) {
        return true
      }
      // Recursive check for indirect dependencies
      const hasIndirect = await this.checkCircularDependency(conceptId, prereq.prerequisiteId)
      if (hasIndirect) {
        return true
      }
    }

    return false
  }

  // Item Management
  async createItem(
    data: CreateItemRequest,
    createdBy?: string,
  ): Promise<typeof items.$inferSelect> {
    // Validate concept exists
    const concept = await db.select().from(concepts).where(eq(concepts.id, data.conceptId)).limit(1)
    if (concept.length === 0) {
      throw new Error('Concept not found')
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(data.title ?? data.body.substring(0, 50))

    const [item] = await db
      .insert(items)
      .values({
        slug,
        conceptId: data.conceptId,
        title: data.title ?? null,
        body: data.body,
        explanation: data.explanation ?? null,
        type: data.type ?? 'MULTIPLE_CHOICE',
        difficulty: data.difficulty ?? 0.5,
        difficultyLevel: data.difficultyLevel ?? 'INTERMEDIATE',
        estimatedTime: data.estimatedTime ?? null,
        options: data.options ?? {},
        correctAnswer: data.correctAnswer ?? null,
        points: data.points ?? 1,
        hints: data.hints ?? [],
        feedback: data.feedback ?? {},
        tags: data.tags ?? [],
        keywords: data.keywords ?? [],
        metadata: data.metadata ?? ({} as ItemMetadata),
        abTestVariant: data.abTestVariant ?? null,
        createdBy: createdBy ?? null,
      })
      .returning()

    if (!item) {
      throw new Error('Failed to create item')
    }

    // Update concept statistics
    await db
      .update(concepts)
      .set({
        totalItems: sql`${concepts.totalItems} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(concepts.id, data.conceptId))

    // Index for search
    await this.indexContentForSearch('item', item.id, {
      title: item.title ?? '',
      content: item.body,
      keywords: item.keywords ?? [],
      tags: item.tags ?? [],
    })

    return item
  }

  async getItems(
    filters: {
      conceptId?: string
      categoryId?: string
      difficulty?: { min: number; max: number }
      itemType?: string
      status?: string
      limit?: number
      offset?: number
      includeInactive?: boolean
    } = {},
  ): Promise<{
    items: Awaited<ReturnType<typeof db.query.items.findMany>>
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
  }> {
    const whereConditions = []

    if (filters.includeInactive !== true) {
      whereConditions.push(eq(items.isActive, true))
    }

    if (filters.status != null && filters.status.trim() !== '') {
      const validStatuses = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED', 'DEPRECATED'] as const
      if (validStatuses.includes(filters.status as (typeof validStatuses)[number])) {
        whereConditions.push(eq(items.status, filters.status as (typeof validStatuses)[number]))
      }
    }

    if (filters.conceptId != null && filters.conceptId.trim() !== '') {
      whereConditions.push(eq(items.conceptId, filters.conceptId))
    }

    if (filters.itemType != null && filters.itemType.trim() !== '') {
      const validTypes = [
        'MULTIPLE_CHOICE',
        'TRUE_FALSE',
        'SCENARIO',
        'FILL_BLANK',
        'MATCHING',
        'ORDERING',
        'INTERACTIVE',
      ] as const
      if (validTypes.includes(filters.itemType as (typeof validTypes)[number])) {
        whereConditions.push(eq(items.type, filters.itemType as (typeof validTypes)[number]))
      }
    }

    if (filters.difficulty) {
      whereConditions.push(
        and(
          gte(items.difficulty, filters.difficulty.min),
          lte(items.difficulty, filters.difficulty.max),
        ),
      )
    }

    // If filtering by category, need to join with concepts
    if (filters.categoryId != null && filters.categoryId.trim() !== '') {
      whereConditions.push(eq(concepts.categoryId, filters.categoryId))
    }

    const query = db.query.items.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        concept: {
          columns: {
            id: true,
            key: true,
            name: true,
          },
          with: {
            category: {
              columns: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
        },
        mediaAssets: {
          with: {
            mediaAsset: {
              columns: {
                id: true,
                filename: true,
                cdnUrl: true,
                type: true,
                alt: true,
              },
            },
          },
        },
      },
      orderBy: [desc(items.createdAt)],
      limit: filters.limit ?? 20,
      offset: filters.offset ?? 0,
    })

    const [itemsResult, totalCount] = await Promise.all([
      query,
      db
        .select({ count: count() })
        .from(items)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
    ])

    const totalCountValue = totalCount[0]?.count ?? 0
    const limitValue = filters.limit ?? 20
    const offsetValue = filters.offset ?? 0

    return {
      items: itemsResult,
      pagination: {
        total: totalCountValue,
        limit: limitValue,
        offset: offsetValue,
        hasMore: totalCountValue > offsetValue + limitValue,
      },
    }
  }

  async getItemBySlug(
    slug: string,
  ): Promise<Awaited<ReturnType<typeof db.query.items.findFirst>> | undefined> {
    return await db.query.items.findFirst({
      where: eq(items.slug, slug),
      with: {
        concept: {
          with: {
            category: true,
            prerequisites: {
              with: {
                prerequisite: true,
              },
            },
          },
        },
        mediaAssets: {
          with: {
            mediaAsset: true,
          },
        },
        versions: {
          columns: {
            id: true,
            version: true,
            createdAt: true,
            status: true,
          },
          orderBy: [desc(items.version)],
        },
      },
    })
  }

  // Content Search
  async searchContent(searchParams: SearchRequest): Promise<SearchResponse> {
    // Build search conditions
    const whereConditions = []

    // Always search active content
    whereConditions.push(eq(searchIndex.isIndexed, true))

    if (searchParams.entityTypes) {
      whereConditions.push(inArray(searchIndex.entityType, searchParams.entityTypes))
    }

    // Text search using PostgreSQL full-text search
    if (searchParams.query.trim() !== '') {
      // cSpell:ignore ILIKE
      whereConditions.push(
        sql`(
          ${searchIndex.title} ILIKE ${`%${searchParams.query}%`} OR
          ${searchIndex.content} ILIKE ${`%${searchParams.query}%`} OR
          ${searchIndex.keywords}::text ILIKE ${`%${searchParams.query}%`} OR
          ${searchIndex.tags}::text ILIKE ${`%${searchParams.query}%`}
        )`,
      )
    }

    // Build sort order
    const orderBy = []
    switch (searchParams.sortBy) {
      case 'relevance':
        orderBy.push(desc(searchIndex.boost), desc(searchIndex.quality))
        break
      case 'popularity':
        orderBy.push(desc(searchIndex.popularity))
        break
      case 'created':
        orderBy.push(
          searchParams.sortOrder === 'asc'
            ? asc(searchIndex.updatedAt)
            : desc(searchIndex.updatedAt),
        )
        break
      default:
        orderBy.push(desc(searchIndex.quality))
    }

    const results = await db
      .select()
      .from(searchIndex)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(...orderBy)
      .limit(searchParams.limit ?? 20)
      .offset(searchParams.offset ?? 0)

    // Get total count
    const totalCount = await db
      .select({ count: count() })
      .from(searchIndex)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)

    const totalCountValue = totalCount[0]?.count ?? 0

    return {
      hits: results.map((hit) => ({
        id: hit.entityId,
        type: hit.entityType,
        source: {
          title: hit.title ?? '',
          content: hit.content,
          keywords: hit.keywords ?? [],
          tags: hit.tags ?? [],
          boost: hit.boost,
          quality: hit.quality,
          popularity: hit.popularity,
        },
      })),
      total: totalCountValue,
    }
  }

  // Content Performance Analytics
  async trackContentPerformance(
    entityType: string,
    entityId: string,
    metrics: {
      views?: number
      attempts?: number
      successfulAttempts?: number
      responseTime?: number
      engagement?: number
    },
  ): Promise<void> {
    const period = 'daily'
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)

    const viewsValue = metrics.views ?? 0
    const attemptsValue = metrics.attempts ?? 0
    const successfulAttemptsValue = metrics.successfulAttempts ?? 0
    const responseTimeValue = metrics.responseTime ?? 0
    const engagementValue = metrics.engagement ?? 0

    // Upsert analytics record
    await db
      .insert(contentAnalytics)
      .values({
        entityType,
        entityId,
        period,
        periodStart,
        periodEnd,
        totalViews: viewsValue,
        totalAttempts: attemptsValue,
        successfulAttempts: successfulAttemptsValue,
        avgResponseTime: responseTimeValue,
        engagementScore: engagementValue,
      })
      .onConflictDoUpdate({
        target: [
          contentAnalytics.entityType,
          contentAnalytics.entityId,
          contentAnalytics.period,
          contentAnalytics.periodStart,
        ],
        set: {
          totalViews: sql`${contentAnalytics.totalViews} + ${viewsValue}`,
          totalAttempts: sql`${contentAnalytics.totalAttempts} + ${attemptsValue}`,
          successfulAttempts: sql`${contentAnalytics.successfulAttempts} + ${successfulAttemptsValue}`,
          avgResponseTime:
            responseTimeValue > 0
              ? sql`(${contentAnalytics.avgResponseTime} + ${responseTimeValue}) / 2`
              : sql`${contentAnalytics.avgResponseTime}`,
          engagementScore:
            engagementValue > 0
              ? sql`(${contentAnalytics.engagementScore} + ${engagementValue}) / 2`
              : sql`${contentAnalytics.engagementScore}`,
        },
      })
  }

  async getContentAnalytics(
    entityType: string,
    entityId: string,
    period = 'daily',
    days = 30,
  ): Promise<(typeof contentAnalytics.$inferSelect)[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return await db
      .select()
      .from(contentAnalytics)
      .where(
        and(
          eq(contentAnalytics.entityType, entityType),
          eq(contentAnalytics.entityId, entityId),
          eq(contentAnalytics.period, period),
          gte(contentAnalytics.periodStart, startDate),
        ),
      )
      .orderBy(asc(contentAnalytics.periodStart))
  }

  // Utility Methods
  private async generateUniqueSlug(text: string): Promise<string> {
    const baseSlug = slugify(text.toLowerCase(), {
      replacement: '-',
      remove: /[*+~.()'";!:@]/g,
      strict: true,
    })

    let slug = baseSlug
    let counter = 1

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await db.select().from(items).where(eq(items.slug, slug)).limit(1)
      if (existing.length === 0) {
        break
      }
      slug = `${baseSlug}-${counter}`
      counter++
    }

    return slug
  }

  private async indexContentForSearch(
    entityType: string,
    entityId: string,
    data: {
      title: string
      content: string
      keywords: string[]
      tags: string[]
      boost?: number
      quality?: number
      popularity?: number
    },
  ): Promise<void> {
    const boostValue = data.boost ?? 1.0
    const qualityValue = data.quality ?? 0.5
    const popularityValue = data.popularity ?? 0.5

    await db
      .insert(searchIndex)
      .values({
        entityType,
        entityId,
        title: data.title,
        content: data.content,
        keywords: data.keywords,
        tags: data.tags,
        boost: boostValue,
        quality: qualityValue,
        popularity: popularityValue,
        isIndexed: true,
      })
      .onConflictDoUpdate({
        target: [searchIndex.entityType, searchIndex.entityId],
        set: {
          title: data.title,
          content: data.content,
          keywords: data.keywords,
          tags: data.tags,
          boost: boostValue,
          quality: qualityValue,
          popularity: popularityValue,
          isIndexed: true,
          updatedAt: new Date(),
        },
      })
  }
}
