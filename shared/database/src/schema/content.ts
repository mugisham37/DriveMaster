import { pgTable, uuid, varchar, jsonb, real, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

// Enums
export const itemStatusEnum = pgEnum('item_status', ['draft', 'under_review', 'approved', 'published', 'archived']);

// Content items table with comprehensive metadata
export const items = pgTable('items', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    slug: varchar('slug', { length: 255 }).notNull().unique(),

    // Content structure
    content: jsonb('content').notNull(), // question text, rich formatting
    choices: jsonb('choices').notNull(), // array of answer options
    correct: jsonb('correct').notNull(), // reference to correct answer(s)
    explanation: jsonb('explanation'), // detailed explanation

    // ML parameters for IRT
    difficulty: real('difficulty').notNull().default(0.0), // IRT difficulty parameter
    discrimination: real('discrimination').default(1.0), // IRT discrimination parameter
    guessing: real('guessing').default(0.25), // IRT guessing parameter

    // Classification and metadata
    topics: jsonb('topics').notNull().default([]), // topic tags for BKT
    jurisdictions: jsonb('jurisdictions').notNull().default([]), // applicable regions
    itemType: varchar('item_type', { length: 50 }).default('multiple_choice'),
    cognitiveLevel: varchar('cognitive_level', { length: 50 }).default('knowledge'), // Bloom's taxonomy

    // Media and resources
    mediaRefs: jsonb('media_refs').default([]), // S3 keys and metadata
    externalRefs: jsonb('external_refs').default([]), // links to regulations, etc.

    // Metadata
    estimatedTime: integer('estimated_time').default(60), // seconds
    points: integer('points').default(1), // scoring weight
    tags: jsonb('tags').default([]), // additional tags

    // Workflow and versioning
    version: integer('version').default(1),
    status: itemStatusEnum('status').default('draft'),
    createdBy: uuid('created_by').references(() => users.id),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    approvedBy: uuid('approved_by').references(() => users.id),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    // Analytics
    usageCount: integer('usage_count').default(0),
    avgResponseTime: integer('avg_response_time').default(0),
    successRate: real('success_rate').default(0.0),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`NOW()`),
    isActive: boolean('is_active').default(true),
});

// Item versions table for content versioning
export const itemVersions = pgTable('item_versions', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),

    // Snapshot of content at this version
    content: jsonb('content').notNull(),
    choices: jsonb('choices').notNull(),
    correct: jsonb('correct').notNull(),
    explanation: jsonb('explanation'),

    // Change metadata
    changeDescription: varchar('change_description'),
    changedBy: uuid('changed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
});

// Content approval workflow
export const contentReviews = pgTable('content_reviews', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    itemId: uuid('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
    status: varchar('status', { length: 20 }).notNull(), // 'pending', 'approved', 'rejected'
    comments: varchar('comments'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).default(sql`NOW()`),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`NOW()`),
});

// Types for TypeScript
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemVersion = typeof itemVersions.$inferSelect;
export type NewItemVersion = typeof itemVersions.$inferInsert;
export type ContentReview = typeof contentReviews.$inferSelect;
export type NewContentReview = typeof contentReviews.$inferInsert;