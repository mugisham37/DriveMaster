#!/usr/bin/env node

import { Command } from 'commander';
import { MigrationRunner, runMigrations, getMigrationStatus, validateSchema, generateMigration } from './migrations';
import { seedDatabase, clearSeedData } from './seed';
import { createMigrationConnection } from './connection';

const program = new Command();

program
    .name('db-cli')
    .description('Database management CLI for Adaptive Learning Platform')
    .version('1.0.0');

// Migration commands
const migrationCommand = program
    .command('migration')
    .description('Database migration commands');

migrationCommand
    .command('run')
    .description('Run pending migrations')
    .option('-f, --folder <folder>', 'Migrations folder', './migrations')
    .action(async (options) => {
        try {
            console.log('Running migrations...');
            await runMigrations(options.folder);
            console.log('Migrations completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
            process.exit(1);
        }
    });

migrationCommand
    .command('status')
    .description('Show migration status')
    .action(async () => {
        try {
            const status = await getMigrationStatus();
            console.log('\nMigration Status:');
            console.log('================');

            if (status.length === 0) {
                console.log('No migrations found');
                return;
            }

            status.forEach(migration => {
                const statusIcon = migration.applied ? '✅' : '❌';
                const executionTime = migration.executionTime ? `(${migration.executionTime}ms)` : '';
                console.log(`${statusIcon} ${migration.name} ${executionTime}`);
                if (migration.appliedAt) {
                    console.log(`   Applied: ${migration.appliedAt.toISOString()}`);
                }
            });
        } catch (error) {
            console.error('Failed to get migration status:', error);
            process.exit(1);
        }
    });

migrationCommand
    .command('generate <name>')
    .description('Generate a new migration file')
    .action(async (name) => {
        try {
            const filepath = await generateMigration(name);
            console.log(`Migration file created: ${filepath}`);
        } catch (error) {
            console.error('Failed to generate migration:', error);
            process.exit(1);
        }
    });

migrationCommand
    .command('rollback')
    .description('Rollback the last migration')
    .action(async () => {
        try {
            const runner = new MigrationRunner();
            await runner.rollbackLastMigration();
            await runner.close();
            console.log('Rollback completed successfully');
        } catch (error) {
            console.error('Rollback failed:', error);
            process.exit(1);
        }
    });

// Schema commands
const schemaCommand = program
    .command('schema')
    .description('Database schema commands');

schemaCommand
    .command('validate')
    .description('Validate database schema')
    .action(async () => {
        try {
            const isValid = await validateSchema();
            if (isValid) {
                console.log('✅ Schema validation passed');
            } else {
                console.log('❌ Schema validation failed');
                process.exit(1);
            }
        } catch (error) {
            console.error('Schema validation error:', error);
            process.exit(1);
        }
    });

// Seed commands
const seedCommand = program
    .command('seed')
    .description('Database seeding commands');

seedCommand
    .command('run')
    .description('Run database seeding')
    .action(async () => {
        try {
            console.log('Starting database seeding...');
            await seedDatabase();
            console.log('Database seeding completed successfully');
        } catch (error) {
            console.error('Database seeding failed:', error);
            process.exit(1);
        }
    });

seedCommand
    .command('clear')
    .description('Clear seed data')
    .option('--confirm', 'Confirm deletion of seed data')
    .action(async (options) => {
        if (!options.confirm) {
            console.log('This will delete all seed data. Use --confirm to proceed.');
            return;
        }

        try {
            console.log('Clearing seed data...');
            await clearSeedData();
            console.log('Seed data cleared successfully');
        } catch (error) {
            console.error('Failed to clear seed data:', error);
            process.exit(1);
        }
    });

// Connection commands
const connectionCommand = program
    .command('connection')
    .description('Database connection commands');

connectionCommand
    .command('test')
    .description('Test database connection')
    .action(async () => {
        try {
            const connection = createMigrationConnection();
            const db = connection.getDb();
            const client = connection.getClient();

            console.log('Testing database connection...');

            // Test basic connectivity
            const healthCheck = await connection.healthCheck();
            if (!healthCheck) {
                throw new Error('Health check failed');
            }

            // Get connection info
            const info = await connection.getConnectionInfo();
            console.log('✅ Connection successful');
            console.log(`Database: ${info.database}`);
            console.log(`User: ${info.user}`);
            console.log(`Version: ${info.version}`);
            console.log(`Current Time: ${info.current_time}`);

            await connection.close();
        } catch (error) {
            console.error('❌ Connection failed:', error);
            process.exit(1);
        }
    });

connectionCommand
    .command('info')
    .description('Show database connection information')
    .action(async () => {
        try {
            const connection = createMigrationConnection();
            const info = await connection.getConnectionInfo();

            console.log('Database Information:');
            console.log('====================');
            console.log(`Database: ${info.database}`);
            console.log(`User: ${info.user}`);
            console.log(`Version: ${info.version}`);
            console.log(`Current Time: ${info.current_time}`);

            // Get additional stats
            const client = connection.getClient();
            const stats = await client`
        SELECT 
          (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
          (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public') as column_count,
          (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as index_count,
          pg_size_pretty(pg_database_size(current_database())) as database_size
      `;

            console.log(`Tables: ${stats[0].table_count}`);
            console.log(`Columns: ${stats[0].column_count}`);
            console.log(`Indexes: ${stats[0].index_count}`);
            console.log(`Size: ${stats[0].database_size}`);

            await connection.close();
        } catch (error) {
            console.error('Failed to get database info:', error);
            process.exit(1);
        }
    });

// Utility commands
program
    .command('reset')
    .description('Reset database (drop all tables and recreate)')
    .option('--confirm', 'Confirm database reset')
    .action(async (options) => {
        if (!options.confirm) {
            console.log('This will completely reset the database. Use --confirm to proceed.');
            return;
        }

        try {
            console.log('Resetting database...');

            const connection = createMigrationConnection();
            const client = connection.getClient();

            // Drop all tables
            await client`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
      `;

            console.log('Database reset completed');
            await connection.close();

            // Run migrations
            console.log('Running migrations...');
            await runMigrations();

            console.log('Database reset and migration completed successfully');
        } catch (error) {
            console.error('Database reset failed:', error);
            process.exit(1);
        }
    });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
    program.outputHelp();
}