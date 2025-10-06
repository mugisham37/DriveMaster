import { createMigrationConnection } from './connection';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
    summary: {
        tablesCreated: number;
        indexesCreated: number;
        triggersCreated: number;
        viewsCreated: number;
    };
}

export class MigrationValidator {
    private db: ReturnType<typeof createMigrationConnection>['getDb'];
    private client: ReturnType<typeof createMigrationConnection>['getClient'];

    constructor() {
        const connection = createMigrationConnection();
        this.db = connection.getDb();
        this.client = connection.getClient();
    }

    async validateMigrations(): Promise<ValidationResult> {
        const result: ValidationResult = {
            passed: true,
            errors: [],
            warnings: [],
            summary: {
                tablesCreated: 0,
                indexesCreated: 0,
                triggersCreated: 0,
                viewsCreated: 0,
            },
        };

        try {
            // Validate required extensions
            await this.validateExtensions(result);

            // Validate tables
            await this.validateTables(result);

            // Validate indexes
            await this.validateIndexes(result);

            // Validate triggers
            await this.validateTriggers(result);

            // Validate views
            await this.validateViews(result);

            // Validate constraints
            await this.validateConstraints(result);

            // Validate data integrity
            await this.validateDataIntegrity(result);

        } catch (error) {
            result.passed = false;
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Validation failed: ${errorMessage}`);
        }

        return result;
    }

    private async validateExtensions(result: ValidationResult) {
        const requiredExtensions = ['uuid-ossp', 'pg_stat_statements', 'pg_trgm'];

        const extensions = await this.client`
      SELECT extname FROM pg_extension WHERE extname = ANY(${requiredExtensions})
    `;

        const installedExtensions = extensions.map((e: any) => e.extname);
        const missingExtensions = requiredExtensions.filter(ext => !installedExtensions.includes(ext));

        if (missingExtensions.length > 0) {
            result.errors.push(`Missing required extensions: ${missingExtensions.join(', ')}`);
            result.passed = false;
        }
    }

    private async validateTables(result: ValidationResult) {
        const requiredTables = [
            'users', 'oauth_providers', 'refresh_tokens',
            'items', 'item_versions', 'content_reviews',
            'sessions', 'attempts', 'skill_mastery', 'user_scheduler_state',
            'placement_tests', 'learning_goals',
            'user_activity', 'item_analytics', 'topic_analytics',
            'user_engagement', 'system_metrics', 'ab_test_results'
        ];

        const tables = await this.client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;

        const existingTables = tables.map((t: any) => t.table_name);
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));

        if (missingTables.length > 0) {
            result.errors.push(`Missing required tables: ${missingTables.join(', ')}`);
            result.passed = false;
        }

        result.summary.tablesCreated = existingTables.length;

        // Validate table structures
        for (const table of requiredTables) {
            if (existingTables.includes(table)) {
                await this.validateTableStructure(table, result);
            }
        }
    }

    private async validateTableStructure(tableName: string, result: ValidationResult) {
        const columns = await this.client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
      ORDER BY ordinal_position
    `;

        // Validate specific table requirements
        switch (tableName) {
            case 'users':
                this.validateUsersTable(columns, result);
                break;
            case 'items':
                this.validateItemsTable(columns, result);
                break;
            case 'attempts':
                this.validateAttemptsTable(columns, result);
                break;
            // Add more table validations as needed
        }
    }

    private validateUsersTable(columns: any[], result: ValidationResult) {
        const requiredColumns = ['id', 'email', 'country_code', 'created_at', 'updated_at'];
        const existingColumns = columns.map((c: any) => c.column_name);

        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        if (missingColumns.length > 0) {
            result.errors.push(`Users table missing columns: ${missingColumns.join(', ')}`);
            result.passed = false;
        }

        // Check email uniqueness constraint
        const emailColumn = columns.find(c => c.column_name === 'email');
        if (emailColumn && emailColumn.is_nullable === 'YES') {
            result.warnings.push('Users.email should be NOT NULL');
        }
    }

    private validateItemsTable(columns: any[], result: ValidationResult) {
        const requiredColumns = ['id', 'slug', 'content', 'choices', 'correct', 'difficulty'];
        const existingColumns = columns.map((c: any) => c.column_name);

        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        if (missingColumns.length > 0) {
            result.errors.push(`Items table missing columns: ${missingColumns.join(', ')}`);
            result.passed = false;
        }
    }

    private async validateAttemptsTable(columns: any[], result: ValidationResult) {
        const requiredColumns = ['id', 'user_id', 'item_id', 'session_id', 'correct', 'client_attempt_id'];
        const existingColumns = columns.map((c: any) => c.column_name);

        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        if (missingColumns.length > 0) {
            result.errors.push(`Attempts table missing columns: ${missingColumns.join(', ')}`);
            result.passed = false;
        }

        // Check if table is partitioned
        const partitionInfo = await this.client`
      SELECT schemaname, tablename, partitionboundspec
      FROM pg_partitions 
      WHERE schemaname = 'public' AND tablename = 'attempts'
    `;

        if (partitionInfo.length === 0) {
            result.warnings.push('Attempts table should be partitioned for better performance');
        }
    }

    private async validateIndexes(result: ValidationResult) {
        const requiredIndexes = [
            'idx_users_email', 'idx_users_country_code',
            'idx_items_slug', 'idx_items_status', 'idx_items_topics',
            'idx_attempts_user_time', 'idx_attempts_client_id',
            'idx_mastery_user', 'idx_scheduler_state_updated'
        ];

        const indexes = await this.client`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `;

        const existingIndexes = indexes.map((i: any) => i.indexname);
        const missingIndexes = requiredIndexes.filter(index => !existingIndexes.includes(index));

        if (missingIndexes.length > 0) {
            result.warnings.push(`Missing recommended indexes: ${missingIndexes.join(', ')}`);
        }

        result.summary.indexesCreated = existingIndexes.length;
    }

    private async validateTriggers(result: ValidationResult) {
        const requiredTriggers = [
            'update_users_updated_at',
            'update_items_updated_at',
            'update_scheduler_state_version_trigger',
            'create_item_version_trigger'
        ];

        const triggers = await this.client`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
    `;

        const existingTriggers = triggers.map((t: any) => t.trigger_name);
        const missingTriggers = requiredTriggers.filter(trigger => !existingTriggers.includes(trigger));

        if (missingTriggers.length > 0) {
            result.warnings.push(`Missing triggers: ${missingTriggers.join(', ')}`);
        }

        result.summary.triggersCreated = existingTriggers.length;
    }

    private async validateViews(result: ValidationResult) {
        const requiredViews = [
            'system_health',
            'connection_stats',
            'user_engagement_summary',
            'content_performance',
            'topic_mastery_overview'
        ];

        const views = await this.client`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `;

        const existingViews = views.map((v: any) => v.table_name);
        const missingViews = requiredViews.filter(view => !existingViews.includes(view));

        if (missingViews.length > 0) {
            result.warnings.push(`Missing views: ${missingViews.join(', ')}`);
        }

        result.summary.viewsCreated = existingViews.length;
    }

    private async validateConstraints(result: ValidationResult) {
        // Check foreign key constraints
        const foreignKeys = await this.client`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `;

        // Validate critical foreign keys exist
        const criticalFKs = [
            { table: 'oauth_providers', column: 'user_id', references: 'users' },
            { table: 'refresh_tokens', column: 'user_id', references: 'users' },
            { table: 'attempts', column: 'user_id', references: 'users' },
            { table: 'attempts', column: 'item_id', references: 'items' },
            { table: 'skill_mastery', column: 'user_id', references: 'users' }
        ];

        for (const fk of criticalFKs) {
            const exists = foreignKeys.some(existing =>
                existing.table_name === fk.table &&
                existing.column_name === fk.column &&
                existing.foreign_table_name === fk.references
            );

            if (!exists) {
                result.errors.push(`Missing foreign key: ${fk.table}.${fk.column} -> ${fk.references}`);
                result.passed = false;
            }
        }
    }

    private async validateDataIntegrity(result: ValidationResult) {
        // Check for orphaned records
        const orphanedChecks = [
            {
                name: 'Orphaned OAuth providers',
                query: `
          SELECT COUNT(*) as count 
          FROM oauth_providers op 
          LEFT JOIN users u ON op.user_id = u.id 
          WHERE u.id IS NULL
        `
            },
            {
                name: 'Orphaned attempts',
                query: `
          SELECT COUNT(*) as count 
          FROM attempts a 
          LEFT JOIN users u ON a.user_id = u.id 
          WHERE u.id IS NULL
        `
            },
            {
                name: 'Invalid mastery values',
                query: `
          SELECT COUNT(*) as count 
          FROM skill_mastery 
          WHERE mastery < 0 OR mastery > 1
        `
            }
        ];

        for (const check of orphanedChecks) {
            const result_query = await this.client.unsafe(check.query);
            const count = parseInt(result_query[0].count);

            if (count > 0) {
                result.warnings.push(`${check.name}: ${count} records found`);
            }
        }
    }

    async close() {
        await this.client.end();
    }
}

// Convenience function
export async function validateMigrations(): Promise<ValidationResult> {
    const validator = new MigrationValidator();
    try {
        return await validator.validateMigrations();
    } finally {
        await validator.close();
    }
}

// CLI usage
if (typeof require !== 'undefined' && require.main === module) {
    validateMigrations()
        .then((result) => {
            console.log('\n=== Migration Validation Results ===');
            console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

            console.log('\nSummary:');
            console.log(`- Tables: ${result.summary.tablesCreated}`);
            console.log(`- Indexes: ${result.summary.indexesCreated}`);
            console.log(`- Triggers: ${result.summary.triggersCreated}`);
            console.log(`- Views: ${result.summary.viewsCreated}`);

            if (result.errors.length > 0) {
                console.log('\n❌ Errors:');
                result.errors.forEach(error => console.log(`  - ${error}`));
            }

            if (result.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                result.warnings.forEach(warning => console.log(`  - ${warning}`));
            }

            if (result.passed && result.errors.length === 0) {
                console.log('\n🎉 All validations passed!');
            }

            process.exit(result.passed ? 0 : 1);
        })
        .catch((error) => {
            console.error('Validation failed:', error);
            process.exit(1);
        });
}