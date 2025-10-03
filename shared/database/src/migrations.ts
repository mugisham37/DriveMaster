import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { createMigrationConnection } from './connection';
import * as fs from 'fs';
import * as path from 'path';

// Migration metadata interface
export interface MigrationInfo {
    id: string;
    name: string;
    timestamp: Date;
    checksum: string;
    applied: boolean;
    appliedAt?: Date;
    executionTime?: number;
}

// Migration runner class
export class MigrationRunner {
    private db: ReturnType<typeof drizzle>;
    private client: postgres.Sql;

    constructor() {
        const connection = createMigrationConnection();
        this.db = connection.getDb();
        this.client = connection.getClient();
    }

    // Initialize migration tracking table
    private async initializeMigrationTable() {
        await this.client`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

        // Enhanced migration tracking
        await this.client`
      CREATE TABLE IF NOT EXISTS migration_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        migration_name VARCHAR(255) NOT NULL,
        migration_hash VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW(),
        execution_time_ms INTEGER,
        success BOOLEAN DEFAULT TRUE,
        error_message TEXT,
        rollback_sql TEXT,
        applied_by VARCHAR(100) DEFAULT current_user
      )
    `;
    }

    // Run pending migrations
    async runMigrations(migrationsFolder: string = './migrations'): Promise<void> {
        try {
            await this.initializeMigrationTable();

            console.log('Starting database migrations...');
            const startTime = Date.now();

            await migrate(this.db, { migrationsFolder });

            const executionTime = Date.now() - startTime;
            console.log(`Migrations completed successfully in ${executionTime}ms`);

        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    // Get migration status
    async getMigrationStatus(): Promise<MigrationInfo[]> {
        await this.initializeMigrationTable();

        const appliedMigrations = await this.client`
      SELECT 
        migration_name,
        migration_hash,
        applied_at,
        execution_time_ms,
        success
      FROM migration_history 
      ORDER BY applied_at DESC
    `;

        return appliedMigrations.map(migration => ({
            id: migration.migration_hash,
            name: migration.migration_name,
            timestamp: migration.applied_at,
            checksum: migration.migration_hash,
            applied: migration.success,
            appliedAt: migration.applied_at,
            executionTime: migration.execution_time_ms,
        }));
    }

    // Rollback last migration (if rollback SQL is available)
    async rollbackLastMigration(): Promise<void> {
        const lastMigration = await this.client`
      SELECT * FROM migration_history 
      WHERE success = true 
      ORDER BY applied_at DESC 
      LIMIT 1
    `;

        if (lastMigration.length === 0) {
            throw new Error('No migrations to rollback');
        }

        const migration = lastMigration[0];
        if (!migration.rollback_sql) {
            throw new Error(`No rollback SQL available for migration: ${migration.migration_name}`);
        }

        try {
            console.log(`Rolling back migration: ${migration.migration_name}`);

            // Execute rollback SQL
            await this.client.unsafe(migration.rollback_sql);

            // Mark as rolled back
            await this.client`
        UPDATE migration_history 
        SET success = false, error_message = 'Rolled back'
        WHERE id = ${migration.id}
      `;

            console.log('Rollback completed successfully');
        } catch (error) {
            console.error('Rollback failed:', error);
            throw error;
        }
    }

    // Validate database schema
    async validateSchema(): Promise<boolean> {
        try {
            // Check if all required tables exist
            const requiredTables = [
                'users', 'oauth_providers', 'refresh_tokens',
                'items', 'item_versions', 'content_reviews',
                'attempts', 'sessions', 'skill_mastery', 'user_scheduler_state',
                'placement_tests', 'learning_goals',
                'user_activity', 'item_analytics', 'topic_analytics',
                'user_engagement', 'system_metrics', 'ab_test_results'
            ];

            const existingTables = await this.client`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `;

            const existingTableNames = existingTables.map(t => t.table_name);
            const missingTables = requiredTables.filter(table => !existingTableNames.includes(table));

            if (missingTables.length > 0) {
                console.error('Missing tables:', missingTables);
                return false;
            }

            // Check if required indexes exist
            const requiredIndexes = [
                'idx_users_email', 'idx_users_country_code',
                'idx_items_slug', 'idx_items_status',
                'idx_attempts_user_time', 'idx_attempts_client_id',
                'idx_mastery_user', 'idx_scheduler_state_updated'
            ];

            const existingIndexes = await this.client`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `;

            const existingIndexNames = existingIndexes.map(i => i.indexname);
            const missingIndexes = requiredIndexes.filter(index => !existingIndexNames.includes(index));

            if (missingIndexes.length > 0) {
                console.warn('Missing indexes (performance may be affected):', missingIndexes);
            }

            console.log('Schema validation passed');
            return true;
        } catch (error) {
            console.error('Schema validation failed:', error);
            return false;
        }
    }

    // Generate migration file
    async generateMigration(name: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `${timestamp}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
        const filepath = path.join('./migrations', filename);

        const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: Add description here

-- Forward migration
BEGIN;

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

COMMIT;

-- Rollback migration (optional)
-- BEGIN;
-- DROP TABLE IF EXISTS example;
-- COMMIT;
`;

        // Ensure migrations directory exists
        const migrationsDir = path.dirname(filepath);
        if (!fs.existsSync(migrationsDir)) {
            fs.mkdirSync(migrationsDir, { recursive: true });
        }

        fs.writeFileSync(filepath, template);
        console.log(`Migration file created: ${filepath}`);

        return filepath;
    }

    // Close connection
    async close() {
        await this.client.end();
    }
}

// Convenience functions
export async function runMigrations(migrationsFolder?: string) {
    const runner = new MigrationRunner();
    try {
        await runner.runMigrations(migrationsFolder);
    } finally {
        await runner.close();
    }
}

export async function getMigrationStatus(): Promise<MigrationInfo[]> {
    const runner = new MigrationRunner();
    try {
        return await runner.getMigrationStatus();
    } finally {
        await runner.close();
    }
}

export async function validateSchema(): Promise<boolean> {
    const runner = new MigrationRunner();
    try {
        return await runner.validateSchema();
    } finally {
        await runner.close();
    }
}

export async function generateMigration(name: string): Promise<string> {
    const runner = new MigrationRunner();
    try {
        return await runner.generateMigration(name);
    } finally {
        await runner.close();
    }
}