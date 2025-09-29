import { eq, and, desc, asc, sql, ilike, inArray, gte, lte, count } from 'drizzle-orm'
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
import slugify from 'slugify'

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
  options?: any
  correctAnswer?: any
  points?: number
  hints?: string[]
  feedback?: any
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

export class ContentService {
  // Category Management
  async createCategory(data: CreateCategoryRequest, createdBy?: string) {
    // Check if key already exists
    const existing = await db.select().from(categories).where(eq(categories.key, data.key)).limit(1)
    if (existing.length > 0) {
      throw new Error('Category key already exists')
    }

    // Validate parent exists if provided
    if (data.parentId) {
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
        description: data.description,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId,
        order: data.order || 0,
        metadata: data.metadata || {},
      })
      .returning()

    // Index for search
    await this.indexContentForSearch('category', category.id, {
      title: category.name,
      content: category.description || '',
      keywords: [],
      tags: [],
    })

    return category
  }

  async getCategories(includeInactive = false) {
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

  async getCategoryByKey(key: string) {
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
  async createConcept(data: CreateConceptRequest, createdBy?: string) {
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
        description: data.description,
        categoryId: data.categoryId,
        learningGoals: data.learningGoals || [],
        difficulty: data.difficulty || 0.5,
        estimatedTime: data.estimatedTime,
        order: data.order || 0,
        tags: data.tags || [],
        metadata: data.metadata || {},
        createdBy,
      })
      .returning()

    // Index for search
    await this.indexContentForSearch('concept', concept.id, {
      title: concept.name,
      content: concept.description || '',
      keywords: concept.learningGoals,
      tags: concept.tags,
    })

    return concept
  }

  async getConcepts(
    filters: {
      categoryId?: string
      includeInactive?: boolean
      difficulty?: { min: number; max: number }
    } = {},
  ) {
    let whereConditions = []

    if (!filters.includeInactive) {
      whereConditions.push(eq(concepts.isActive, true))
    }

    if (filters.categoryId) {
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

  async getConceptByKey(key: string) {
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

  async addConceptPrerequisite(
    conceptId: string,
    prerequisiteId: string,
    weight = 1.0,
    isRequired = true,
  ) {
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
  async createItem(data: CreateItemRequest, createdBy?: string) {
    // Validate concept exists
    const concept = await db.select().from(concepts).where(eq(concepts.id, data.conceptId)).limit(1)
    if (concept.length === 0) {
      throw new Error('Concept not found')
    }

    // Generate unique slug
    const slug = await this.generateUniqueSlug(data.title || data.body.substring(0, 50))

    const [item] = await db
      .insert(items)
      .values({
        slug,
        conceptId: data.conceptId,
        title: data.title,
        body: data.body,
        explanation: data.explanation,
        type: data.type || 'MULTIPLE_CHOICE',
        difficulty: data.difficulty || 0.5,
        difficultyLevel: data.difficultyLevel || 'INTERMEDIATE',
        estimatedTime: data.estimatedTime,
        options: data.options || {},
        correctAnswer: data.correctAnswer,
        points: data.points || 1,
        hints: data.hints || [],
        feedback: data.feedback || {},
        tags: data.tags || [],
        keywords: data.keywords || [],
        metadata: data.metadata || {},
        abTestVariant: data.abTestVariant,
        createdBy,
      })
      .returning()

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
      title: item.title || '',
      content: item.body,
      keywords: item.keywords,
      tags: item.tags,
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
  ) {
    let whereConditions = []

    if (!filters.includeInactive) {
      whereConditions.push(eq(items.isActive, true))
    }

    if (filters.status) {
      whereConditions.push(eq(items.status, filters.status as any))
    }

    if (filters.conceptId) {
      whereConditions.push(eq(items.conceptId, filters.conceptId))
    }

    if (filters.itemType) {
      whereConditions.push(eq(items.type, filters.itemType as any))
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
    if (filters.categoryId) {
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
      limit: filters.limit || 20,
      offset: filters.offset || 0,
    })

    const [itemsResult, totalCount] = await Promise.all([
      query,
      db
        .select({ count: count() })
        .from(items)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined),
    ])

    return {
      items: itemsResult,
      pagination: {
        total: totalCount[0].count,
        limit: filters.limit || 20,
        offset: filters.offset || 0,
        hasMore: totalCount[0].count > (filters.offset || 0) + (filters.limit || 20),
      },
    }
  }

  async getItemBySlug(slug: string) {
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
  async searchContent(searchParams: SearchRequest) {
    // Build search conditions
    let whereConditions = []

    // Always search active content
    whereConditions.push(eq(searchIndex.isIndexed, true))

    if (searchParams.entityTypes) {
      whereConditions.push(inArray(searchIndex.entityType, searchParams.entityTypes))
    }

    // Text search using PostgreSQL full-text search
    if (searchParams.query) {
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
    let orderBy = []
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
      .limit(searchParams.limit || 20)
      .offset(searchParams.offset || 0)

    // Get total count
    const totalCount = await db
      .select({ count: count() })
      .from(searchIndex)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)

    return {
      hits: results.map((hit) => ({
        id: hit.entityId,
        type: hit.entityType,
        source: {
          title: hit.title,
          content: hit.content,
          keywords: hit.keywords,
          tags: hit.tags,
          boost: hit.boost,
          quality: hit.quality,
          popularity: hit.popularity,
        },
      })),
      total: totalCount[0].count,
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
  ) {
    const period = 'daily'
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)

    // Upsert analytics record
    await db
      .insert(contentAnalytics)
      .values({
        entityType,
        entityId,
        period,
        periodStart,
        periodEnd,
        totalViews: metrics.views || 0,
        totalAttempts: metrics.attempts || 0,
        successfulAttempts: metrics.successfulAttempts || 0,
        avgResponseTime: metrics.responseTime || 0,
        engagementScore: metrics.engagement || 0,
      })
      .onConflictDoUpdate({
        target: [
          contentAnalytics.entityType,
          contentAnalytics.entityId,
          contentAnalytics.period,
          contentAnalytics.periodStart,
        ],
        set: {
          totalViews: sql`${contentAnalytics.totalViews} + ${metrics.views || 0}`,
          totalAttempts: sql`${contentAnalytics.totalAttempts} + ${metrics.attempts || 0}`,
          successfulAttempts: sql`${contentAnalytics.successfulAttempts} + ${metrics.successfulAttempts || 0}`,
          avgResponseTime: metrics.responseTime
            ? sql`(${contentAnalytics.avgResponseTime} + ${metrics.responseTime}) / 2`
            : contentAnalytics.avgResponseTime,
          engagementScore: metrics.engagement
            ? sql`(${contentAnalytics.engagementScore} + ${metrics.engagement}) / 2`
            : contentAnalytics.engagementScore,
        },
      })
  }

  async getContentAnalytics(entityType: string, entityId: string, period = 'daily', days = 30) {
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
    let baseSlug = slugify(text.toLowerCase(), {
      replacement: '-',
      remove: /[*+~.()'";!:@]/g,
      strict: true,
    })

    let slug = baseSlug
    let counter = 1

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
  ) {
    await db
      .insert(searchIndex)
      .values({
        entityType,
        entityId,
        title: data.title,
        content: data.content,
        keywords: data.keywords,
        tags: data.tags,
        boost: data.boost || 1.0,
        quality: data.quality || 0.5,
        popularity: data.popularity || 0.5,
        isIndexed: true,
      })
      .onConflictDoUpdate({
        target: [searchIndex.entityType, searchIndex.entityId],
        set: {
          title: data.title,
          content: data.content,
          keywords: data.keywords,
          tags: data.tags,
          boost: data.boost || 1.0,
          quality: data.quality || 0.5,
          popularity: data.popularity || 0.5,
          isIndexed: true,
          updatedAt: new Date(),
        },
      })
  }
}
