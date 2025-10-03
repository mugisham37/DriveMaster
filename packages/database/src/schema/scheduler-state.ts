import { pgTable, uuid, jsonb, timestamp, bigint } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userSchedulerState = pgTable('user_scheduler_state', {
    userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    abilityVector: jsonb('ability_vector').default('{}').notNull(),
    sm2States: jsonb('sm2_states').default('{}').notNull(),
    bktStates: jsonb('bkt_states').default('{}').notNull(),
    lastUpdated: timestamp('last_updated').defaultNow(),
    version: bigint('version', { mode: 'number' }).default(1),
});