// Main entry point for the database package
export * from './connection';
export * from './migrations';
export * from './seed';

// Export schema with explicit naming to avoid conflicts
export { schema } from './schema';
export * as schemaTypes from './schema';

// Re-export commonly used Drizzle utilities
export { drizzle } from 'drizzle-orm/postgres-js';
export type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';