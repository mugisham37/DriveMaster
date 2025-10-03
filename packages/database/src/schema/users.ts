import { pgTable, uuid, varchar, boolean, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    hashedPassword: varchar('hashed_password', { length: 255 }),
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    preferences: jsonb('preferences').default('{}'),
    mfaSecret: varchar('mfa_secret', { length: 255 }),
    isMfaEnabled: boolean('is_mfa_enabled').default(false),
    failedLoginAttempts: integer('failed_login_attempts').default(0),
    lockedUntil: timestamp('locked_until'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    lastActiveAt: timestamp('last_active_at').defaultNow(),
    isActive: boolean('is_active').default(true),
}, (table) => {
    return {
        emailIdx: index('idx_users_email').on(table.email),
        countryCodeIdx: index('idx_users_country_code').on(table.countryCode),
        lastActiveIdx: index('idx_users_last_active').on(table.lastActiveAt),
    };
});