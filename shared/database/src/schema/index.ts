// Export all schema definitions
// This file serves as the main entry point for database schema

// Export all tables and types
export * from './users';
export * from './content';
export * from './learning';
export * from './analytics';

// Re-export commonly used functions from drizzle-orm
export { eq, and, or, not, isNull, isNotNull, inArray, notInArray, exists, notExists } from 'drizzle-orm';

// Create a schema object containing all tables for drizzle
import { users, oauthProviders, refreshTokens } from './users';
import { items } from './content';
import { attempts, sessions, skillMastery, userSchedulerState, placementTests, learningGoals } from './learning';

export const schema = {
    // User tables
    users,
    oauthProviders,
    refreshTokens,

    // Content tables
    items,

    // Learning tables
    attempts,
    sessions,
    skillMastery,
    userSchedulerState,
    placementTests,
    learningGoals,
};