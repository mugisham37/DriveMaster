import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  boolean,
  integer,
  real,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums for content management
export const contentStatusEnum = pgEnum('content_status', [
  'DRAFT',
  'REVIEW',
  'PUBLISHED',
  'ARCHIVED',
  'DEPRECATED',
])

export const itemTypeEnum = pgEnum('item_type', [
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'SCENARIO',
  'FILL_BLANK',
  'MATCHING',
  'ORDERING',
  'INTERACTIVE',
])

export const mediaTypeEnum = pgEnum('media_type', [
  'IMAGE',
  'VIDEO',
  'AUDIO',
  'ANIMATION',
  'SIMULATION',
])

export const difficultyLevelEnum = pgEnum('difficulty_level', [
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
  'EXPERT',
])

export const contentCategoryEnum = pgEnum('content_category', [
  'traffic_signs',
  'road_rules',
  'safety_procedures',
  'situational_judgment',
  'vehicle_operations',
  'parking_maneuvers',
  'hazard_perception',
])

// Core Types for JSONB fields
export interface CategoryMetadata {
  tags: string[]
  color?: string
  icon?: string
  description?: string
  learningObjectives?: string[]
}

export interface ConceptMetadata {
  tags: string[]
  learningGoals: string[]
  estimatedTime?: number // minutes
  prerequisites?: string[]
  difficulty?: number
}

export interface ItemMetadata {
  tags: string[]
  keywords: string[]
  estimatedTime?: number // seconds
  mediaType?: 'text' | 'image' | 'video' | 'interactive'
  accessibility?: {
    altText?: string
    captions?: boolean
    transcript?: boolean
  }
  lastReviewed?: string
  reviewerNotes?: string
}

export interface ItemOptions {
  choices?: Array<{
    id: string
    text: string
    isCorrect: boolean
  }>
  correctAnswer?: any
  explanation?: string
  hints?: string[]
}

export interface ItemFeedback {
  correct?: string
  incorrect?: string
  partial?: string
  hints?: string[]
}

// Hierarchical Categories - Traffic signs, road rules, safety, etc.
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 100 }).unique().notNull(), // "traffic_signs", "road_rules"
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 255 }),
    color: varchar('color', { length: 7 }), // Hex color code
    order: integer('order').default(0),
    isActive: boolean('is_active').default(true),

    // Hierarchy support
    parentId: uuid('parent_id'),

    // Metadata
    metadata: jsonb('metadata').$type<CategoryMetadata>().default({}),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    keyIdx: uniqueIndex('categories_key_idx').on(table.key),
    parentIdx: index('categories_parent_idx').on(table.parentId),
    orderIdx: index('categories_order_idx').on(table.order),
    activeIdx: index('categories_active_idx').on(table.isActive),
  }),
)

// Learning Concepts within categories
export const concepts = pgTable(
  'concepts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 100 }).unique().notNull(), // "stop_signs", "right_of_way"
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    learningGoals: jsonb('learning_goals').$type<string[]>().default([]),

    // Categorization
    categoryId: uuid('category_id')
      .references(() => categories.id)
      .notNull(),

    // Difficulty and progression
    difficulty: real('difficulty').default(0.5), // 0-1 scale
    estimatedTime: integer('estimated_time'), // Minutes to master
    order: integer('order').default(0),

    // Content status
    status: contentStatusEnum('status').default('DRAFT'),
    isActive: boolean('is_active').default(true),

    // Analytics and performance data
    totalItems: integer('total_items').default(0),
    avgDifficulty: real('avg_difficulty').default(0.5),
    avgEngagement: real('avg_engagement').default(0.5),
    successRate: real('success_rate').default(0.5),

    // Metadata
    metadata: jsonb('metadata').$type<ConceptMetadata>().default({}),
    tags: jsonb('tags').$type<string[]>().default([]),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: varchar('created_by', { length: 255 }),
    updatedBy: varchar('updated_by', { length: 255 }),
  },
  (table) => ({
    keyIdx: uniqueIndex('concepts_key_idx').on(table.key),
    categoryIdx: index('concepts_category_idx').on(table.categoryId),
    difficultyIdx: index('concepts_difficulty_idx').on(table.difficulty),
    statusIdx: index('concepts_status_idx').on(table.status),
    activeIdx: index('concepts_active_idx').on(table.isActive),
    orderIdx: index('concepts_order_idx').on(table.order),
    successRateIdx: index('concepts_success_rate_idx').on(table.successRate),
  }),
)

// Concept Prerequisites and Dependencies
export const conceptPrerequisites = pgTable(
  'concept_prerequisites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conceptId: uuid('concept_id')
      .references(() => concepts.id, { onDelete: 'cascade' })
      .notNull(),
    prerequisiteId: uuid('prerequisite_id')
      .references(() => concepts.id, { onDelete: 'cascade' })
      .notNull(),
    weight: real('weight').default(1.0), // Strength of dependency
    isRequired: boolean('is_required').default(true),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    conceptPrereqIdx: uniqueIndex('concept_prerequisites_concept_prereq_idx').on(
      table.conceptId,
      table.prerequisiteId,
    ),
    conceptIdx: index('concept_prerequisites_concept_idx').on(table.conceptId),
    prerequisiteIdx: index('concept_prerequisites_prerequisite_idx').on(table.prerequisiteId),
  }),
)

// Content Items (questions, scenarios, etc.)
export const items = pgTable(
  'items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),

    // Content organization
    conceptId: uuid('concept_id')
      .references(() => concepts.id)
      .notNull(),

    // Basic content
    title: varchar('title', { length: 255 }),
    body: text('body').notNull(),
    explanation: text('explanation'), // Explanation for correct answer

    // Item configuration
    type: itemTypeEnum('type').default('MULTIPLE_CHOICE'),
    difficulty: real('difficulty').default(0.5), // 0-1 scale
    difficultyLevel: difficultyLevelEnum('difficulty_level').default('INTERMEDIATE'),
    estimatedTime: integer('estimated_time'), // Seconds to complete

    // Answer configuration
    options: jsonb('options').$type<ItemOptions>().default({}),
    correctAnswer: jsonb('correct_answer'), // Flexible answer format

    // Scoring and feedback
    points: integer('points').default(1),
    hints: jsonb('hints').$type<string[]>().default([]),
    feedback: jsonb('feedback').$type<ItemFeedback>().default({}),

    // IRT Parameters (updated by adaptive service)
    discrimination: real('discrimination').default(1.0), // IRT 'a' parameter
    difficultyIRT: real('difficulty_irt').default(0.0), // IRT 'b' parameter
    guessing: real('guessing').default(0.2), // IRT 'c' parameter

    // Performance analytics
    totalAttempts: integer('total_attempts').default(0),
    correctAttempts: integer('correct_attempts').default(0),
    successRate: real('success_rate').default(0.0),
    avgResponseTime: real('avg_response_time').default(0.0),
    engagementScore: real('engagement_score').default(0.5),

    // Content status and lifecycle
    status: contentStatusEnum('status').default('DRAFT'),
    isActive: boolean('is_active').default(true),
    publishedAt: timestamp('published_at'),

    // Versioning
    version: integer('version').default(1),
    parentItemId: uuid('parent_item_id'),

    // A/B Testing
    abTestVariant: varchar('ab_test_variant', { length: 50 }),
    abTestWeight: real('ab_test_weight').default(1.0),

    // Metadata and tagging
    tags: jsonb('tags').$type<string[]>().default([]),
    keywords: jsonb('keywords').$type<string[]>().default([]),
    metadata: jsonb('metadata').$type<ItemMetadata>().default({}),

    // Audit trail
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: varchar('created_by', { length: 255 }),
    updatedBy: varchar('updated_by', { length: 255 }),
  },
  (table) => ({
    slugIdx: uniqueIndex('items_slug_idx').on(table.slug),
    conceptIdx: index('items_concept_idx').on(table.conceptId),
    typeIdx: index('items_type_idx').on(table.type),
    difficultyIdx: index('items_difficulty_idx').on(table.difficulty),
    statusIdx: index('items_status_idx').on(table.status),
    activeIdx: index('items_active_idx').on(table.isActive),
    successRateIdx: index('items_success_rate_idx').on(table.successRate),
    engagementIdx: index('items_engagement_idx').on(table.engagementScore),
    publishedIdx: index('items_published_idx').on(table.publishedAt),
    abTestIdx: index('items_ab_test_idx').on(table.abTestVariant),
    parentItemIdx: index('items_parent_item_idx').on(table.parentItemId),
  }),
)

// Media Assets (images, videos, etc.)
export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filename: varchar('filename', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    size: integer('size').notNull(), // Bytes
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'), // For audio/video in seconds

    // Storage information
    storageUrl: varchar('storage_url', { length: 500 }).notNull(),
    cdnUrl: varchar('cdn_url', { length: 500 }),
    thumbnail: varchar('thumbnail', { length: 500 }), // Thumbnail URL

    // Classification
    type: mediaTypeEnum('type').notNull(),
    alt: text('alt'), // Alt text for accessibility
    caption: text('caption'),

    // Usage tracking
    usageCount: integer('usage_count').default(0),

    // Metadata
    metadata: jsonb('metadata').default({}),
    tags: jsonb('tags').$type<string[]>().default([]),

    // Status
    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    uploadedBy: varchar('uploaded_by', { length: 255 }),
  },
  (table) => ({
    filenameIdx: index('media_assets_filename_idx').on(table.filename),
    typeIdx: index('media_assets_type_idx').on(table.type),
    mimeTypeIdx: index('media_assets_mime_type_idx').on(table.mimeType),
    activeIdx: index('media_assets_active_idx').on(table.isActive),
    usageIdx: index('media_assets_usage_idx').on(table.usageCount),
  }),
)

// Item Media Relations (many-to-many)
export const itemMediaAssets = pgTable(
  'item_media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .references(() => items.id, { onDelete: 'cascade' })
      .notNull(),
    mediaAssetId: uuid('media_asset_id')
      .references(() => mediaAssets.id, { onDelete: 'cascade' })
      .notNull(),
    order: integer('order').default(0),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    itemMediaIdx: uniqueIndex('item_media_assets_item_media_idx').on(
      table.itemId,
      table.mediaAssetId,
    ),
    itemIdx: index('item_media_assets_item_idx').on(table.itemId),
    mediaIdx: index('item_media_assets_media_idx').on(table.mediaAssetId),
  }),
)

// A/B Testing experiments
export const abTests = pgTable(
  'ab_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Test configuration
    hypothesis: text('hypothesis').notNull(), // What we're testing
    variants: jsonb('variants').notNull(), // Variant configurations
    trafficSplit: jsonb('traffic_split').notNull(), // Traffic allocation

    // Targeting
    targetConcepts: jsonb('target_concepts').$type<string[]>().default([]),
    targetUsers: jsonb('target_users').$type<string[]>().default([]),

    // Status and timing
    status: varchar('status', { length: 20 }).default('DRAFT'), // DRAFT, RUNNING, PAUSED, COMPLETED
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),

    // Results
    results: jsonb('results').default({}),
    winner: varchar('winner', { length: 50 }), // Winning variant
    confidence: real('confidence'), // Statistical confidence

    // Metadata
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    createdBy: varchar('created_by', { length: 255 }),
  },
  (table) => ({
    nameIdx: index('ab_tests_name_idx').on(table.name),
    statusIdx: index('ab_tests_status_idx').on(table.status),
    startDateIdx: index('ab_tests_start_date_idx').on(table.startDate),
    endDateIdx: index('ab_tests_end_date_idx').on(table.endDate),
  }),
)

// Content performance analytics
export const contentAnalytics = pgTable(
  'content_analytics',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Reference
    entityType: varchar('entity_type', { length: 20 }).notNull(), // "item", "concept", "category"
    entityId: uuid('entity_id').notNull(),

    // Time period
    period: varchar('period', { length: 20 }).notNull(), // "daily", "weekly", "monthly"
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),

    // Performance metrics
    totalViews: integer('total_views').default(0),
    uniqueUsers: integer('unique_users').default(0),
    totalAttempts: integer('total_attempts').default(0),
    successfulAttempts: integer('successful_attempts').default(0),
    avgResponseTime: real('avg_response_time').default(0.0),
    avgConfidence: real('avg_confidence').default(0.0),
    dropoffRate: real('dropoff_rate').default(0.0),

    // Engagement metrics
    engagementScore: real('engagement_score').default(0.0),
    timeSpent: real('time_spent').default(0.0),
    completionRate: real('completion_rate').default(0.0),

    // Learning effectiveness
    knowledgeGain: real('knowledge_gain').default(0.0),
    retentionRate: real('retention_rate').default(0.0),
    difficultyRating: real('difficulty_rating').default(0.0),

    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    entityPeriodIdx: uniqueIndex('content_analytics_entity_period_idx').on(
      table.entityType,
      table.entityId,
      table.period,
      table.periodStart,
    ),
    entityIdx: index('content_analytics_entity_idx').on(table.entityType, table.entityId),
    periodIdx: index('content_analytics_period_idx').on(table.period),
    periodStartIdx: index('content_analytics_period_start_idx').on(table.periodStart),
  }),
)

// Content search and discovery
export const searchIndex = pgTable(
  'search_index',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 20 }).notNull(), // "item", "concept", "category"
    entityId: uuid('entity_id').notNull(),

    // Search content
    title: varchar('title', { length: 255 }),
    content: text('content').notNull(),
    keywords: jsonb('keywords').$type<string[]>().default([]),
    tags: jsonb('tags').$type<string[]>().default([]),

    // Search boosting
    boost: real('boost').default(1.0),
    quality: real('quality').default(0.5),
    popularity: real('popularity').default(0.5),

    // Status
    isIndexed: boolean('is_indexed').default(false),

    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    entityIdx: uniqueIndex('search_index_entity_idx').on(table.entityType, table.entityId),
    indexedIdx: index('search_index_indexed_idx').on(table.isIndexed),
    qualityIdx: index('search_index_quality_idx').on(table.quality),
    popularityIdx: index('search_index_popularity_idx').on(table.popularity),
  }),
)

// Relations for better query experience
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'CategoryHierarchy',
  }),
  children: many(categories, { relationName: 'CategoryHierarchy' }),
  concepts: many(concepts),
}))

export const conceptsRelations = relations(concepts, ({ one, many }) => ({
  category: one(categories, {
    fields: [concepts.categoryId],
    references: [categories.id],
  }),
  items: many(items),
  prerequisites: many(conceptPrerequisites, { relationName: 'ConceptPrerequisites' }),
  dependents: many(conceptPrerequisites, { relationName: 'ConceptDependents' }),
}))

export const conceptPrerequisitesRelations = relations(conceptPrerequisites, ({ one }) => ({
  concept: one(concepts, {
    fields: [conceptPrerequisites.conceptId],
    references: [concepts.id],
    relationName: 'ConceptPrerequisites',
  }),
  prerequisite: one(concepts, {
    fields: [conceptPrerequisites.prerequisiteId],
    references: [concepts.id],
    relationName: 'ConceptDependents',
  }),
}))

export const itemsRelations = relations(items, ({ one, many }) => ({
  concept: one(concepts, {
    fields: [items.conceptId],
    references: [concepts.id],
  }),
  parentItem: one(items, {
    fields: [items.parentItemId],
    references: [items.id],
    relationName: 'ItemVersions',
  }),
  versions: many(items, { relationName: 'ItemVersions' }),
  mediaAssets: many(itemMediaAssets),
}))

export const mediaAssetsRelations = relations(mediaAssets, ({ many }) => ({
  items: many(itemMediaAssets),
}))

export const itemMediaAssetsRelations = relations(itemMediaAssets, ({ one }) => ({
  item: one(items, {
    fields: [itemMediaAssets.itemId],
    references: [items.id],
  }),
  mediaAsset: one(mediaAssets, {
    fields: [itemMediaAssets.mediaAssetId],
    references: [mediaAssets.id],
  }),
}))
