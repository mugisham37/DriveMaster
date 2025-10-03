import { pgTable, uuid, varchar, real, timestamp, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const skillMastery = pgTable('skill_mastery', {
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    topic: varchar('topic', { length: 100 }).notNull(),
    mastery: real('mastery').notNull(),
    lastPracticed: timestamp('last_practiced').notNull(),
    practiceCount: integer('practice_count').default(0),
}, (table) => {
    return {
        pk: primaryKey({ columns: [table.userId, table.topic] }),
        userIdIdx: index('idx_skill_mastery_user_id').on(table.userId),
        topicIdx: index('idx_skill_mastery_topic').on(table.topic),
    };
});