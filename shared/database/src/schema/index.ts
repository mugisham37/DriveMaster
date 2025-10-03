// Export all schema tables and types
export * from './users';
export * from './content';
export * from './learning';
export * from './analytics';

// Re-export commonly used Drizzle utilities
export { sql, eq, and, or, not, isNull, isNotNull, inArray, notInArray } from 'drizzle-orm';
export { pgTable, pgEnum, uuid, varchar, text, integer, real, boolean, timestamptz, jsonb, bigint } from 'drizzle-orm/pg-core';