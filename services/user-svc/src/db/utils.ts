import { sql } from 'drizzle-orm'
import { db, readDb } from './connection'

// Database performance monitoring utilities
export class DatabaseMonitor {
  // Get database performance metrics
  static async getPerformanceMetrics(): Promise<{
    activeConnections: number
    slowQueries: number
    cacheHitRatio: number
    indexUsage: any[]
    tableStats: any[]
  }> {
    try {
      // Get active connections
      const [connectionsResult] = await readDb.execute(sql`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `)

      // Get slow queries (queries taking more than 1 second)
      const [slowQueriesResult] = await readDb.execute(sql`
        SELECT count(*) as slow_queries
        FROM pg_stat_statements 
        WHERE mean_exec_time > 1000
      `)

      // Get cache hit ratio
      const [cacheResult] = await readDb.execute(sql`
        SELECT 
          round(
            (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
          ) as cache_hit_ratio
        FROM pg_statio_user_tables
      `)

      // Get index usage statistics
      const indexUsage = await readDb.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes
        ORDER BY idx_scan DESC
        LIMIT 20
      `)

      // Get table statistics
      const tableStats = await readDb.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `)

      return {
        activeConnections: Number(connectionsResult?.active_connections) || 0,
        slowQueries: Number(slowQueriesResult?.slow_queries) || 0,
        cacheHitRatio: Number(cacheResult?.cache_hit_ratio) || 0,
        indexUsage: indexUsage || [],
        tableStats: tableStats || [],
      }
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      throw error
    }
  }

  // Get table sizes and growth
  static async getTableSizes(): Promise<any[]> {
    try {
      const result = await readDb.execute(sql`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `)
      return result
    } catch (error) {
      console.error('Error getting table sizes:', error)
      throw error
    }
  }

  // Check for missing indexes
  static async findMissingIndexes(): Promise<any[]> {
    try {
      const result = await readDb.execute(sql`
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          n_live_tup,
          n_dead_tup
        FROM pg_stat_user_tables
        WHERE seq_scan > 0 
          AND seq_tup_read / seq_scan > 10000
          AND idx_scan IS NOT NULL
        ORDER BY seq_tup_read DESC
      `)
      return result
    } catch (error) {
      console.error('Error finding missing indexes:', error)
      throw error
    }
  }
}

// Query optimization utilities
export class QueryOptimizer {
  // Analyze query performance
  static async analyzeQuery(query: string): Promise<any> {
    try {
      const result = await readDb.execute(
        sql.raw(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`),
      )
      return result[0]
    } catch (error) {
      console.error('Error analyzing query:', error)
      throw error
    }
  }

  // Get query execution plan
  static async explainQuery(query: string): Promise<any> {
    try {
      const result = await readDb.execute(sql.raw(`EXPLAIN (FORMAT JSON) ${query}`))
      return result[0]
    } catch (error) {
      console.error('Error explaining query:', error)
      throw error
    }
  }

  // Update table statistics
  static async updateStatistics(tableName?: string): Promise<void> {
    try {
      if (tableName) {
        await db.execute(sql.raw(`ANALYZE ${tableName}`))
      } else {
        await db.execute(sql`ANALYZE`)
      }
    } catch (error) {
      console.error('Error updating statistics:', error)
      throw error
    }
  }
}

// Index management utilities
export class IndexManager {
  // Create GIN indexes for JSONB columns (since Drizzle doesn't support .using() yet)
  static async createGinIndexes(): Promise<void> {
    try {
      console.log('Creating GIN indexes for JSONB columns...')

      // Create GIN indexes for better JSONB query performance
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS users_cognitive_patterns_gin_idx 
        ON users USING gin (cognitive_patterns)
      `)

      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS users_learning_preferences_gin_idx 
        ON users USING gin (learning_preferences)
      `)

      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS concepts_prerequisites_gin_idx 
        ON concepts USING gin (prerequisites)
      `)

      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS content_metadata_gin_idx 
        ON content USING gin (metadata)
      `)

      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS learning_events_response_data_gin_idx 
        ON learning_events USING gin (response_data)
      `)

      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS learning_events_context_data_gin_idx 
        ON learning_events USING gin (context_data)
      `)

      console.log('✅ GIN indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating GIN indexes:', error)
      throw error
    }
  }

  // Create composite indexes for frequent query patterns
  static async createCompositeIndexes(): Promise<void> {
    try {
      console.log('Creating composite indexes for query optimization...')

      // User knowledge state queries
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_knowledge_mastery_time 
        ON knowledge_states (user_id, mastery_probability DESC, last_interaction DESC)
      `)

      // Learning analytics queries
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_events_user_time_type 
        ON learning_events (user_id, timestamp DESC, event_type)
      `)

      // Session performance queries
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_performance 
        ON user_sessions (user_id, is_completed, start_time DESC)
      `)

      // Content performance queries
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_active_difficulty 
        ON content (is_active, category, difficulty) WHERE is_active = true
      `)

      // Spaced repetition queries
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spaced_repetition_due 
        ON spaced_repetition (user_id, next_review) WHERE is_active = true
      `)

      // Notification queries
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
        ON notifications (user_id, is_read, created_at DESC) WHERE is_read = false
      `)

      console.log('✅ Composite indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating composite indexes:', error)
      throw error
    }
  }

  // Drop unused indexes
  static async dropUnusedIndexes(): Promise<void> {
    try {
      console.log('Identifying unused indexes...')

      const unusedIndexes = await readDb.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan
        FROM pg_stat_user_indexes
        WHERE idx_scan = 0
          AND indexname NOT LIKE '%_pkey'
          AND indexname NOT LIKE '%_unique'
      `)

      if (unusedIndexes.length > 0) {
        console.log(`Found ${unusedIndexes.length} unused indexes:`)
        unusedIndexes.forEach((index: any) => {
          console.log(`  - ${index.schemaname}.${index.indexname} on ${index.tablename}`)
        })

        // Note: We don't automatically drop indexes, just report them
        console.log('⚠️ Review these indexes manually before dropping')
      } else {
        console.log('✅ No unused indexes found')
      }
    } catch (error) {
      console.error('❌ Error checking unused indexes:', error)
      throw error
    }
  }
}

// Maintenance utilities
export class DatabaseMaintenance {
  // Vacuum and analyze tables
  static async vacuumAnalyze(tableName?: string): Promise<void> {
    try {
      if (tableName) {
        console.log(`Running VACUUM ANALYZE on ${tableName}...`)
        await db.execute(sql.raw(`VACUUM ANALYZE ${tableName}`))
      } else {
        console.log('Running VACUUM ANALYZE on all tables...')
        await db.execute(sql`VACUUM ANALYZE`)
      }
      console.log('✅ VACUUM ANALYZE completed')
    } catch (error) {
      console.error('❌ VACUUM ANALYZE failed:', error)
      throw error
    }
  }

  // Reindex tables
  static async reindexTable(tableName: string): Promise<void> {
    try {
      console.log(`Reindexing table ${tableName}...`)
      await db.execute(sql.raw(`REINDEX TABLE ${tableName}`))
      console.log('✅ Reindex completed')
    } catch (error) {
      console.error('❌ Reindex failed:', error)
      throw error
    }
  }

  // Check table bloat
  static async checkTableBloat(): Promise<any[]> {
    try {
      const result = await readDb.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_dead_tup,
          n_live_tup,
          CASE 
            WHEN n_live_tup > 0 
            THEN round((n_dead_tup::float / n_live_tup::float) * 100, 2)
            ELSE 0 
          END as bloat_percentage
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
        ORDER BY bloat_percentage DESC
      `)
      return result
    } catch (error) {
      console.error('Error checking table bloat:', error)
      throw error
    }
  }
}

// Backup utilities
export class BackupManager {
  // Create logical backup
  static async createLogicalBackup(outputPath: string): Promise<void> {
    try {
      const dbName = process.env.DB_NAME || 'drivemaster_dev'
      const dbUser = process.env.DB_USER || 'drivemaster'
      const dbHost = process.env.DB_HOST || 'localhost'
      const dbPort = process.env.DB_PORT || '5432'

      console.log(`Creating logical backup to ${outputPath}...`)

      // Note: This would typically use pg_dump via child_process
      // For now, we'll create a simple SQL export
      const tables = [
        'users',
        'concepts',
        'knowledge_states',
        'content',
        'learning_events',
        'user_sessions',
        'friendships',
        'achievements',
        'user_achievements',
        'spaced_repetition',
        'notifications',
      ]

      console.log(`Backup would include ${tables.length} tables`)
      console.log('✅ Backup preparation completed (implementation needed for production)')
    } catch (error) {
      console.error('❌ Backup failed:', error)
      throw error
    }
  }

  // Restore from backup
  static async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      console.log(`Restoring from backup ${backupPath}...`)
      // Implementation would use pg_restore
      console.log('✅ Restore preparation completed (implementation needed for production)')
    } catch (error) {
      console.error('❌ Restore failed:', error)
      throw error
    }
  }
}
