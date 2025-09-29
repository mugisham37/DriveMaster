import { sql } from 'drizzle-orm'
import { db, readDb } from './connection'

// Advanced database optimization features
export class DatabaseOptimizer {
  // Create materialized views for complex analytics queries
  static async createMaterializedViews(): Promise<void> {
    try {
      console.log('Creating materialized views for analytics...')

      // User learning progress summary view
      await db.execute(sql`
        CREATE MATERIALIZED VIEW IF NOT EXISTS user_learning_progress AS
        SELECT 
          u.id as user_id,
          u.email,
          u.total_xp,
          u.current_streak,
          u.longest_streak,
          COUNT(DISTINCT ks.concept_id) as concepts_studied,
          AVG(ks.mastery_probability) as avg_mastery,
          COUNT(DISTINCT CASE WHEN ks.mastery_probability > 0.8 THEN ks.concept_id END) as concepts_mastered,
          MAX(ks.last_interaction) as last_learning_activity,
          COUNT(DISTINCT us.id) as total_sessions,
          AVG(us.questions_correct::float / NULLIF(us.questions_attempted, 0)) as avg_accuracy
        FROM users u
        LEFT JOIN knowledge_states ks ON u.id = ks.user_id
        LEFT JOIN user_sessions us ON u.id = us.user_id AND us.is_completed = true
        WHERE u.is_active = true
        GROUP BY u.id, u.email, u.total_xp, u.current_streak, u.longest_streak
      `)

      // Content performance analytics view
      await db.execute(sql`
        CREATE MATERIALIZED VIEW IF NOT EXISTS content_performance_analytics AS
        SELECT 
          c.id as content_id,
          c.title,
          c.category,
          c.difficulty,
          c.discrimination,
          c.total_attempts,
          c.correct_attempts,
          CASE 
            WHEN c.total_attempts > 0 
            THEN c.correct_attempts::float / c.total_attempts 
            ELSE 0 
          END as success_rate,
          c.average_response_time,
          COUNT(DISTINCT le.user_id) as unique_users_attempted,
          AVG(CASE WHEN le.response_data->>'isCorrect' = 'true' THEN 1 ELSE 0 END) as actual_success_rate,
          AVG((le.response_data->>'responseTime')::int) as avg_response_time_events,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (le.response_data->>'responseTime')::int) as median_response_time,
          COUNT(le.id) as total_learning_events
        FROM content c
        LEFT JOIN learning_events le ON c.id = le.content_id 
          AND le.event_type = 'question_answered'
          AND le.timestamp >= NOW() - INTERVAL '30 days'
        WHERE c.is_active = true
        GROUP BY c.id, c.title, c.category, c.difficulty, c.discrimination, 
                 c.total_attempts, c.correct_attempts, c.average_response_time
      `)

      // Daily learning analytics view
      await db.execute(sql`
        CREATE MATERIALIZED VIEW IF NOT EXISTS daily_learning_analytics AS
        SELECT 
          DATE(le.timestamp) as learning_date,
          COUNT(DISTINCT le.user_id) as active_users,
          COUNT(le.id) as total_events,
          COUNT(CASE WHEN le.event_type = 'question_answered' THEN 1 END) as questions_answered,
          COUNT(CASE WHEN le.event_type = 'session_started' THEN 1 END) as sessions_started,
          COUNT(CASE WHEN le.event_type = 'concept_mastered' THEN 1 END) as concepts_mastered,
          AVG(CASE WHEN le.response_data->>'isCorrect' = 'true' THEN 1 ELSE 0 END) as avg_accuracy,
          AVG((le.response_data->>'responseTime')::int) as avg_response_time,
          COUNT(DISTINCT le.concept_id) as concepts_practiced
        FROM learning_events le
        WHERE le.timestamp >= NOW() - INTERVAL '90 days'
        GROUP BY DATE(le.timestamp)
        ORDER BY learning_date DESC
      `)

      // Concept mastery progression view
      await db.execute(sql`
        CREATE MATERIALIZED VIEW IF NOT EXISTS concept_mastery_progression AS
        SELECT 
          c.id as concept_id,
          c.key as concept_key,
          c.name as concept_name,
          c.category,
          c.base_difficulty,
          COUNT(ks.user_id) as users_studying,
          AVG(ks.mastery_probability) as avg_mastery_probability,
          COUNT(CASE WHEN ks.mastery_probability > 0.8 THEN 1 END) as users_mastered,
          COUNT(CASE WHEN ks.mastery_probability BETWEEN 0.5 AND 0.8 THEN 1 END) as users_progressing,
          COUNT(CASE WHEN ks.mastery_probability < 0.5 THEN 1 END) as users_struggling,
          AVG(ks.interaction_count) as avg_interactions,
          AVG(ks.personal_learning_velocity) as avg_learning_velocity
        FROM concepts c
        LEFT JOIN knowledge_states ks ON c.id = ks.concept_id
        WHERE c.is_active = true
        GROUP BY c.id, c.key, c.name, c.category, c.base_difficulty
      `)

      console.log('✅ Materialized views created successfully')
    } catch (error) {
      console.error('❌ Error creating materialized views:', error)
      throw error
    }
  }

  // Refresh materialized views with concurrency
  static async refreshMaterializedViews(): Promise<void> {
    try {
      console.log('Refreshing materialized views...')

      const views = [
        'user_learning_progress',
        'content_performance_analytics',
        'daily_learning_analytics',
        'concept_mastery_progression',
      ]

      // Refresh views concurrently for better performance
      await Promise.all(
        views.map(async (view) => {
          await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`))
          console.log(`  ✅ Refreshed ${view}`)
        }),
      )

      console.log('✅ All materialized views refreshed')
    } catch (error) {
      console.error('❌ Error refreshing materialized views:', error)
      throw error
    }
  }

  // Create refresh strategy with scheduled updates
  static async setupMaterializedViewRefresh(): Promise<void> {
    try {
      console.log('Setting up materialized view refresh strategy...')

      // Create function to refresh views
      await db.execute(sql`
        CREATE OR REPLACE FUNCTION refresh_analytics_views()
        RETURNS void AS $$
        BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY user_learning_progress;
          REFRESH MATERIALIZED VIEW CONCURRENTLY content_performance_analytics;
          REFRESH MATERIALIZED VIEW CONCURRENTLY daily_learning_analytics;
          REFRESH MATERIALIZED VIEW CONCURRENTLY concept_mastery_progression;
        END;
        $$ LANGUAGE plpgsql;
      `)

      // Note: In production, you would set up pg_cron or similar for scheduling
      console.log('✅ Materialized view refresh function created')
      console.log(
        'ℹ️  Set up pg_cron or external scheduler to call refresh_analytics_views() periodically',
      )
    } catch (error) {
      console.error('❌ Error setting up materialized view refresh:', error)
      throw error
    }
  }

  // Optimize query performance with advanced indexes
  static async createAdvancedIndexes(): Promise<void> {
    try {
      console.log('Creating advanced performance indexes...')

      // Covering indexes to avoid table lookups
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_states_covering
        ON knowledge_states (user_id, concept_id) 
        INCLUDE (mastery_probability, last_interaction, interaction_count)
      `)

      // Functional indexes for computed values
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_success_rate
        ON content ((correct_attempts::float / NULLIF(total_attempts, 0)))
        WHERE total_attempts > 0
      `)

      // Partial indexes for active records only
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_streak
        ON users (current_streak DESC, total_xp DESC)
        WHERE is_active = true AND current_streak > 0
      `)

      // Expression indexes for JSONB queries
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_events_correct_responses
        ON learning_events ((response_data->>'isCorrect'))
        WHERE event_type = 'question_answered'
      `)

      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_events_response_time
        ON learning_events (((response_data->>'responseTime')::int))
        WHERE event_type = 'question_answered' AND response_data->>'responseTime' IS NOT NULL
      `)

      // Multi-column indexes for complex queries
      await db.execute(sql`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_performance_analysis
        ON user_sessions (user_id, start_time DESC, is_completed)
        INCLUDE (questions_attempted, questions_correct, xp_earned, duration)
      `)

      console.log('✅ Advanced indexes created successfully')
    } catch (error) {
      console.error('❌ Error creating advanced indexes:', error)
      throw error
    }
  }

  // Database performance tuning
  static async optimizePerformance(): Promise<void> {
    try {
      console.log('Optimizing database performance...')

      // Update table statistics
      await db.execute(sql`ANALYZE`)

      // Optimize PostgreSQL settings (these would typically be in postgresql.conf)
      const optimizationQueries = [
        // Enable parallel query execution
        `SET max_parallel_workers_per_gather = 4`,

        // Optimize work memory for complex queries
        `SET work_mem = '256MB'`,

        // Enable JIT compilation for complex queries
        `SET jit = on`,

        // Optimize random page cost for SSD storage
        `SET random_page_cost = 1.1`,

        // Enable effective caching
        `SET effective_cache_size = '4GB'`,
      ]

      for (const query of optimizationQueries) {
        try {
          await db.execute(sql.raw(query))
        } catch (error) {
          console.warn(`Warning: Could not apply setting: ${query}`)
        }
      }

      console.log('✅ Performance optimization completed')
    } catch (error) {
      console.error('❌ Error optimizing performance:', error)
      throw error
    }
  }
}

// Connection pooling and read replica management
export class ConnectionManager {
  // Configure PgBouncer settings (for external PgBouncer setup)
  static getPgBouncerConfig(): string {
    return `
# PgBouncer Configuration for DriveMaster
[databases]
drivemaster_dev = host=localhost port=5432 dbname=drivemaster_dev user=drivemaster
drivemaster_prod = host=localhost port=5432 dbname=drivemaster_prod user=drivemaster

[pgbouncer]
# Connection pooling settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5

# Performance settings
max_db_connections = 50
max_user_connections = 50
server_round_robin = 1
ignore_startup_parameters = extra_float_digits

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

# Security
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Timeouts
server_lifetime = 3600
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 0
query_wait_timeout = 120
client_login_timeout = 60
autodb_idle_timeout = 3600

# Admin
admin_users = postgres, drivemaster_admin
stats_users = postgres, drivemaster_admin
    `
  }

  // Read replica routing logic
  static async routeQuery<T>(
    query: () => Promise<T>,
    options: { preferReplica?: boolean; maxReplicaLag?: number } = {},
  ): Promise<T> {
    const { preferReplica = true, maxReplicaLag = 5000 } = options

    if (!preferReplica) {
      // Force primary database
      return await query()
    }

    try {
      // Check replica lag (in production, you'd check actual replication lag)
      const replicaHealthy = await this.checkReplicaHealth(maxReplicaLag)

      if (replicaHealthy) {
        // Use read replica
        return await query()
      } else {
        console.warn('Read replica unhealthy, falling back to primary')
        return await query()
      }
    } catch (error) {
      console.warn('Read replica failed, falling back to primary:', error)
      return await query()
    }
  }

  // Check read replica health and lag
  static async checkReplicaHealth(maxLagMs: number = 5000): Promise<boolean> {
    try {
      // In production, you would check actual replication lag
      // This is a simplified version
      const [result] = await readDb.execute(sql`
        SELECT 
          CASE 
            WHEN pg_is_in_recovery() THEN 
              EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000
            ELSE 0 
          END as lag_ms
      `)

      const lagMs = Number(result?.lag_ms) || 0
      return lagMs <= maxLagMs
    } catch (error) {
      console.error('Error checking replica health:', error)
      return false
    }
  }

  // Connection pool monitoring
  static async getConnectionPoolStats(): Promise<{
    totalConnections: number
    activeConnections: number
    idleConnections: number
    waitingConnections: number
  }> {
    try {
      const [stats] = await db.execute(sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `)

      return {
        totalConnections: Number(stats?.total_connections) || 0,
        activeConnections: Number(stats?.active_connections) || 0,
        idleConnections: Number(stats?.idle_connections) || 0,
        waitingConnections: Number(stats?.waiting_connections) || 0,
      }
    } catch (error) {
      console.error('Error getting connection pool stats:', error)
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
      }
    }
  }
}

// Health monitoring and metrics collection
export class HealthMonitor {
  // Comprehensive health check
  static async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    checks: Record<string, { status: boolean; latency?: number; error?: string }>
    metrics: Record<string, number>
  }> {
    const checks: Record<string, { status: boolean; latency?: number; error?: string }> = {}
    const metrics: Record<string, number> = {}

    try {
      // Database connectivity check
      const dbStart = Date.now()
      try {
        await db.execute(sql`SELECT 1`)
        checks.database = { status: true, latency: Date.now() - dbStart }
      } catch (error) {
        checks.database = {
          status: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }

      // Read replica check
      const replicaStart = Date.now()
      try {
        await readDb.execute(sql`SELECT 1`)
        checks.readReplica = { status: true, latency: Date.now() - replicaStart }
      } catch (error) {
        checks.readReplica = {
          status: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }

      // Performance metrics
      const performanceMetrics = await this.getPerformanceMetrics()
      Object.assign(metrics, performanceMetrics)

      // Connection pool health
      const poolStats = await ConnectionManager.getConnectionPoolStats()
      metrics.totalConnections = poolStats.totalConnections
      metrics.activeConnections = poolStats.activeConnections
      metrics.connectionUtilization =
        poolStats.totalConnections > 0
          ? poolStats.activeConnections / poolStats.totalConnections
          : 0

      // Determine overall status
      const allChecksHealthy = Object.values(checks).every((check) => check.status)
      const highConnectionUtilization = metrics.connectionUtilization > 0.8
      const slowQueries = metrics.slowQueries > 10

      let status: 'healthy' | 'degraded' | 'unhealthy'
      if (!allChecksHealthy) {
        status = 'unhealthy'
      } else if (highConnectionUtilization || slowQueries) {
        status = 'degraded'
      } else {
        status = 'healthy'
      }

      return { status, checks, metrics }
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: {
          general: {
            status: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        metrics: {},
      }
    }
  }

  // Get detailed performance metrics
  static async getPerformanceMetrics(): Promise<Record<string, number>> {
    try {
      // Query performance metrics
      const [queryStats] = await readDb.execute(sql`
        SELECT 
          count(*) as total_queries,
          count(*) FILTER (WHERE mean_exec_time > 1000) as slow_queries,
          avg(mean_exec_time) as avg_query_time,
          max(mean_exec_time) as max_query_time
        FROM pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      `)

      // Cache hit ratio
      const [cacheStats] = await readDb.execute(sql`
        SELECT 
          round(
            (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
          ) as cache_hit_ratio
        FROM pg_statio_user_tables
      `)

      // Index usage
      const [indexStats] = await readDb.execute(sql`
        SELECT 
          count(*) as total_indexes,
          count(*) FILTER (WHERE idx_scan = 0) as unused_indexes,
          avg(idx_scan) as avg_index_scans
        FROM pg_stat_user_indexes
      `)

      // Table statistics
      const [tableStats] = await readDb.execute(sql`
        SELECT 
          sum(n_tup_ins) as total_inserts,
          sum(n_tup_upd) as total_updates,
          sum(n_tup_del) as total_deletes,
          sum(n_live_tup) as total_live_tuples,
          sum(n_dead_tup) as total_dead_tuples
        FROM pg_stat_user_tables
      `)

      return {
        totalQueries: Number(queryStats?.total_queries) || 0,
        slowQueries: Number(queryStats?.slow_queries) || 0,
        avgQueryTime: Number(queryStats?.avg_query_time) || 0,
        maxQueryTime: Number(queryStats?.max_query_time) || 0,
        cacheHitRatio: Number(cacheStats?.cache_hit_ratio) || 0,
        totalIndexes: Number(indexStats?.total_indexes) || 0,
        unusedIndexes: Number(indexStats?.unused_indexes) || 0,
        avgIndexScans: Number(indexStats?.avg_index_scans) || 0,
        totalInserts: Number(tableStats?.total_inserts) || 0,
        totalUpdates: Number(tableStats?.total_updates) || 0,
        totalDeletes: Number(tableStats?.total_deletes) || 0,
        totalLiveTuples: Number(tableStats?.total_live_tuples) || 0,
        totalDeadTuples: Number(tableStats?.total_dead_tuples) || 0,
      }
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      return {}
    }
  }

  // Monitor long-running queries
  static async getLongRunningQueries(thresholdSeconds: number = 30): Promise<any[]> {
    try {
      const result = await readDb.execute(sql`
        SELECT 
          pid,
          now() - pg_stat_activity.query_start AS duration,
          query,
          state,
          usename,
          application_name,
          client_addr
        FROM pg_stat_activity
        WHERE (now() - pg_stat_activity.query_start) > interval '${sql.raw(thresholdSeconds.toString())} seconds'
          AND state != 'idle'
          AND query NOT LIKE '%pg_stat_activity%'
        ORDER BY duration DESC
      `)
      return result
    } catch (error) {
      console.error('Error getting long-running queries:', error)
      return []
    }
  }
}

// Backup and recovery utilities
export class BackupManager {
  // Create logical backup with compression
  static async createLogicalBackup(options: {
    outputPath: string
    compress?: boolean
    includeData?: boolean
    tables?: string[]
  }): Promise<void> {
    const { outputPath, compress = true, includeData = true, tables } = options

    try {
      console.log(`Creating logical backup to ${outputPath}...`)

      // In production, this would use pg_dump via child_process
      // For now, we'll create a comprehensive backup strategy

      const backupMetadata = {
        timestamp: new Date().toISOString(),
        database: process.env.DB_NAME,
        version: '1.0.0',
        includeData,
        tables: tables || 'all',
        compressed: compress,
      }

      console.log('Backup metadata:', backupMetadata)
      console.log('✅ Backup strategy prepared (pg_dump implementation needed for production)')
    } catch (error) {
      console.error('❌ Backup failed:', error)
      throw error
    }
  }

  // Point-in-time recovery setup
  static async setupPointInTimeRecovery(): Promise<void> {
    try {
      console.log('Setting up point-in-time recovery...')

      // Check WAL archiving status
      const [walStatus] = await db.execute(sql`
        SELECT 
          name,
          setting,
          context
        FROM pg_settings 
        WHERE name IN ('wal_level', 'archive_mode', 'archive_command', 'max_wal_senders')
      `)

      console.log('Current WAL settings:', walStatus)
      console.log('ℹ️  Configure postgresql.conf for WAL archiving in production:')
      console.log('  wal_level = replica')
      console.log('  archive_mode = on')
      console.log("  archive_command = 'cp %p /path/to/archive/%f'")
      console.log('  max_wal_senders = 3')
    } catch (error) {
      console.error('❌ Error setting up PITR:', error)
      throw error
    }
  }

  // Automated backup scheduling
  static getBackupScheduleConfig(): string {
    return `
# Automated Backup Schedule Configuration

## Daily Full Backup (2 AM)
0 2 * * * pg_dump -h localhost -U drivemaster -d drivemaster_prod -Fc -f /backups/daily/drivemaster_\$(date +\%Y\%m\%d).backup

## Hourly WAL Archive Cleanup (keep 24 hours)
0 * * * * find /wal_archive -name "*.backup" -mtime +1 -delete

## Weekly Schema-Only Backup (Sunday 3 AM)
0 3 * * 0 pg_dump -h localhost -U drivemaster -d drivemaster_prod -s -f /backups/weekly/schema_\$(date +\%Y\%m\%d).sql

## Monthly Archive (1st of month, 4 AM)
0 4 1 * * pg_dump -h localhost -U drivemaster -d drivemaster_prod -Fc -f /backups/monthly/drivemaster_\$(date +\%Y\%m).backup

## Backup Verification (Daily 5 AM)
0 5 * * * /scripts/verify_backup.sh /backups/daily/drivemaster_\$(date +\%Y\%m\%d).backup
    `
  }
}
