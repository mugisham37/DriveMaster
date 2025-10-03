// Main entry point for the database package
export * from './schema';
export * from './connection';
export * from './migrations';
export * from './seed';

// Re-export commonly used Drizzle utilities
export { drizzle } from 'drizzle-orm/postgres-js';
export type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';