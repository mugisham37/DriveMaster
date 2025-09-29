import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { sql } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import fs from 'fs/promises'
import path from 'path'

// Migration configuration
const migrationConfig = {
  migrationsFolder: './src/db/migrations',
  migrationsTable: '__drizzle_migrations',
}

// Database connection for migrations
const migrationSql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'drivemaster_dev',
  username: process.env.DB_USER || 'drivemaster',
  password: process.env.DB_PASSWORD || 'dev_password_123',
  max: 1, // Single connection for migrations
})

const migrationDb = drizzle(migrationSql)

// Migration metadata interface
interface MigrationMetadata {
  id: string
  name: string
  timestamp: number
  hash: string
  appliedAt?: Date
  rolledBackAt?: Date
}

// Create migrations table if it doesn't exist
async function ensureMigrationsTable(): Promise<void> {
  await migrationSql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationConfig.migrationsTable)} (
      id SERIAL PRIMARY KEY,
      hash VARCHAR(255) NOT NULL,
      created_at BIGINT NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW(),
      rolled_back_at TIMESTAMP NULL
    )
  `
}

// Get applied migrations
async function getAppliedMigrations(): Promise<MigrationMetadata[]> {
  const result = await migrationSql`
    SELECT hash, created_at, applied_at, rolled_back_at 
    FROM ${sql.identifier(migrationConfig.migrationsTable)}
    WHERE rolled_back_at IS NULL
    ORDER BY created_at ASC
  `

  return result.map((row: any) => ({
    id: row.hash,
    name: '', // Will be filled from file system
    timestamp: row.created_at,
    hash: row.hash,
    appliedAt: row.applied_at,
    rolledBackAt: row.rolled_back_at,
  }))
}

// Run migrations
export async function runMigrations(): Promise<void> {
  try {
    console.log('🚀 Starting database migrations...')

    await ensureMigrationsTable()

    // Use Drizzle's built-in migration system
    await migrate(migrationDb, { migrationsFolder: migrationConfig.migrationsFolder })

    console.log('✅ Migrations completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Rollback last migration
export async function rollbackLastMigration(): Promise<void> {
  try {
    console.log('🔄 Rolling back last migration...')

    await ensureMigrationsTable()

    // Get the last applied migration
    const lastMigration = await migrationSql`
      SELECT hash, created_at 
      FROM ${sql.identifier(migrationConfig.migrationsTable)}
      WHERE rolled_back_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (lastMigration.length === 0) {
      console.log('ℹ️ No migrations to rollback')
      return
    }

    const migration = lastMigration[0]

    // Look for rollback SQL file
    const migrationFiles = await fs.readdir(migrationConfig.migrationsFolder)
    const rollbackFile = migrationFiles.find(
      (file) => file.includes(migration.hash) && file.endsWith('.rollback.sql'),
    )

    if (!rollbackFile) {
      throw new Error(`Rollback file not found for migration ${migration.hash}`)
    }

    // Execute rollback SQL
    const rollbackSql = await fs.readFile(
      path.join(migrationConfig.migrationsFolder, rollbackFile),
      'utf-8',
    )

    await migrationSql.unsafe(rollbackSql)

    // Mark migration as rolled back
    await migrationSql`
      UPDATE ${sql.identifier(migrationConfig.migrationsTable)}
      SET rolled_back_at = NOW()
      WHERE hash = ${migration.hash}
    `

    console.log(`✅ Successfully rolled back migration: ${migration.hash}`)
  } catch (error) {
    console.error('❌ Rollback failed:', error)
    throw error
  }
}

// Get migration status
export async function getMigrationStatus(): Promise<{
  applied: MigrationMetadata[]
  pending: string[]
  canRollback: boolean
}> {
  try {
    await ensureMigrationsTable()

    const applied = await getAppliedMigrations()

    // Get all migration files
    const migrationFiles = await fs.readdir(migrationConfig.migrationsFolder)
    const allMigrations = migrationFiles
      .filter((file) => file.endsWith('.sql') && !file.endsWith('.rollback.sql'))
      .sort()

    const appliedHashes = new Set(applied.map((m) => m.hash))
    const pending = allMigrations.filter((file) => {
      // Extract hash from filename (assuming format: timestamp_hash_name.sql)
      const parts = file.split('_')
      const hash = parts[1] || file.replace('.sql', '')
      return !appliedHashes.has(hash)
    })

    return {
      applied,
      pending,
      canRollback: applied.length > 0,
    }
  } catch (error) {
    console.error('Error getting migration status:', error)
    throw error
  }
}

// Create database partitions for horizontal scaling
export async function createPartitions(): Promise<void> {
  try {
    console.log('🔧 Creating database partitions...')

    // Create partitions for knowledge_states table by user_id hash
    await migrationSql`
      -- Create partitioned table for knowledge_states if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'knowledge_states_partitioned'
        ) THEN
          CREATE TABLE knowledge_states_partitioned (
            LIKE knowledge_states INCLUDING ALL
          ) PARTITION BY HASH (user_id);
          
          -- Create 8 partitions for horizontal scaling
          CREATE TABLE knowledge_states_p0 PARTITION OF knowledge_states_partitioned
            FOR VALUES WITH (modulus 8, remainder 0);
          CREATE TABLE knowledge_states_p1 PARTITION OF knowledge_states_partitioned
            FOR VALUES WITH (modulus 8, remainder 1);
          CREATE TABLE knowledge_states_p2 PARTITION OF knowledge_states_partitioned
            FOR VALUES WITH (modulus 8, remainder 2);
          CREATE TABLE knowledge_states_p3 PARTITION OF knowledge_states_partitioned
            FOR VALUES WITH (modulus 8, remainder 3);
          CREATE TABLE knowledge_states_p4 PARTITION OF knowledge_states_partitioned
            FOR VALUES WITH (modulus 8, remainder 4);
          CREATE TABLE knowledge_states_p5 PARTITION OF knowledge_states_partitioned
            FOR VALUES WITH (modulus 8, remainder 5);
          CREATE TABLE knowledge_states_p6 PARTITION OF knowledge_states_partitioned
            FOR VALUES WITH (modulus 8, remainder 6);
          CREATE TABLE knowledge_states_p7 PARTITION OF knowledge_states_partitioned
            FOR VALUES WITH (modulus 8, remainder 7);
        END IF;
      END $$;
    `

    // Create partitions for learning_events table by timestamp (monthly)
    await migrationSql`
      -- Create partitioned table for learning_events if not exists
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'learning_events_partitioned'
        ) THEN
          CREATE TABLE learning_events_partitioned (
            LIKE learning_events INCLUDING ALL
          ) PARTITION BY RANGE (timestamp);
          
          -- Create monthly partitions for the next 12 months
          CREATE TABLE learning_events_2024_01 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
          CREATE TABLE learning_events_2024_02 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
          CREATE TABLE learning_events_2024_03 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
          CREATE TABLE learning_events_2024_04 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
          CREATE TABLE learning_events_2024_05 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
          CREATE TABLE learning_events_2024_06 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
          CREATE TABLE learning_events_2024_07 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
          CREATE TABLE learning_events_2024_08 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
          CREATE TABLE learning_events_2024_09 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
          CREATE TABLE learning_events_2024_10 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
          CREATE TABLE learning_events_2024_11 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
          CREATE TABLE learning_events_2024_12 PARTITION OF learning_events_partitioned
            FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
        END IF;
      END $$;
    `

    console.log('✅ Database partitions created successfully')
  } catch (error) {
    console.error('❌ Partition creation failed:', error)
    throw error
  }
}

// Optimize database performance
export async function optimizeDatabase(): Promise<void> {
  try {
    console.log('⚡ Optimizing database performance...')

    // Update table statistics for query planner
    await migrationSql`ANALYZE`

    // Vacuum tables to reclaim space and update statistics
    await migrationSql`VACUUM ANALYZE`

    // Create additional performance indexes if they don't exist
    await migrationSql`
      -- Composite index for frequent user knowledge queries
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_performance 
      ON knowledge_states (user_id, mastery_probability DESC, last_interaction DESC);
      
      -- Index for learning event analytics
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_events_analytics
      ON learning_events (user_id, event_type, timestamp DESC);
      
      -- Index for session performance queries
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_performance
      ON user_sessions (user_id, is_completed, start_time DESC);
      
      -- Partial index for active content only
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_active_performance
      ON content (category, difficulty) WHERE is_active = true;
    `

    console.log('✅ Database optimization completed')
  } catch (error) {
    console.error('❌ Database optimization failed:', error)
    throw error
  }
}

// Close migration connection
export async function closeMigrationConnection(): Promise<void> {
  await migrationSql.end()
}
