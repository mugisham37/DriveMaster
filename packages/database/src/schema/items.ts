import { pgTable, uuid, varchar, jsonb, real, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const items = pgTable('items', {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    content: jsonb('content').notNull(),
    choices: jsonb('choices').notNull(),
    correct: jsonb('correct').notNull(),
    difficulty: real('difficulty').default(0.0).notNull(),
    topics: jsonb('topics').default('[]').notNull(),
    jurisdictions: jsonb('jurisdictions').default('[]').notNull(),
    mediaRefs: jsonb('media_refs').default('[]').notNull(),
    estimatedTime: integer('estimated_time').default(60).notNull(),
    version: integer('version').default(1).notNull(),
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    createdBy: uuid('created_by').references(() => users.id),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    isActive: boolean('is_active').default(true),
}, (table) => {
    return {
        slugIdx: index('idx_items_slug').on(table.slug),
        difficultyIdx: index('idx_items_difficulty').on(table.difficulty),
        statusIdx: index('idx_items_status').on(table.status),
        publishedAtIdx: index('idx_items_published_at').on(table.publishedAt),
        // GIN indexes for JSONB arrays - these will be created via raw SQL in migrations
    };
});