import { pgTable, uuid, varchar, boolean, timestamptz, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['learner', 'content_author', 'content_reviewer', 'admin']);

// Users table with comprehensive security and audit fields
export const users = pgTable('users', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false),
    hashedPassword: varchar('hashed_password', { length: 255 }), // NULL for OAuth-only users
    countryCode: varchar('country_code', { length: 2 }).notNull(),
    timezone: varchar('timezone', { length: 50 }).default('UTC'),
    language: varchar('language', { length: 5 }).default('en'),
    preferences: jsonb('preferences').default({}),
    userRole: userRoleEnum('user_role').default('learner'),

    // Security fields
    mfaEnabled: boolean('mfa_enabled').default(false),
    mfaSecret: varchar('mfa_secret', { length: 255 }),
    failedLoginAttempts: integer('failed_login_attempts').default(0),
    lockedUntil: timestamptz('locked_until'),
    passwordChangedAt: timestamptz('password_changed_at').default(sql`NOW()`),

    // Privacy and compliance
    gdprConsent: boolean('gdpr_consent').default(false),
    gdprConsentDate: timestamptz('gdpr_consent_date'),
    dataRetentionUntil: timestamptz('data_retention_until'),

    // Audit fields
    createdAt: timestamptz('created_at').default(sql`NOW()`),
    updatedAt: timestamptz('updated_at').default(sql`NOW()`),
    lastActiveAt: timestamptz('last_active_at').default(sql`NOW()`),
    isActive: boolean('is_active').default(true),
});

// OAuth providers table
export const oauthProviders = pgTable('oauth_providers', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    accessTokenHash: varchar('access_token_hash', { length: 255 }),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
    expiresAt: timestamptz('expires_at'),
    scope: varchar('scope'),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
    updatedAt: timestamptz('updated_at').default(sql`NOW()`),
});

// Refresh tokens table
export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    expiresAt: timestamptz('expires_at').notNull(),
    revoked: boolean('revoked').default(false),
    revokedAt: timestamptz('revoked_at'),
    deviceInfo: jsonb('device_info').default({}),
    ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
    userAgent: varchar('user_agent'),
    createdAt: timestamptz('created_at').default(sql`NOW()`),
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthProvider = typeof oauthProviders.$inferSelect;
export type NewOAuthProvider = typeof oauthProviders.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;