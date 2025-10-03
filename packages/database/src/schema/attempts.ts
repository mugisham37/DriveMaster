import { pgTable, uuid, jsonb, boolean, integer, bigint, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { items } from './items';

export const attempts = pgTable('attempts', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    itemId: uuid('item_id').references(() => items.id).notNull(),
    selected: jsonb('selected').notNull(),
    correct: boolean('correct').notNull(),
    quality: integer('quality').notNull(),
    timeTakenMs: bigint('time_taken_ms', { mode: 'number' }).notNull(),
    hintsUsed: integer('hints_used').default(0).notNull(),
    clientAttemptId: varchar('client_attempt_id', { length: 255 }).unique().notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    sm2StateBefore: jsonb('sm2_state_before'),
    sm2StateAfter: jsonb('sm2_state_after'),
    bktStateBefore: jsonb('bkt_state_before'),
    bktStateAfter: jsonb('bkt_state_after'),
});