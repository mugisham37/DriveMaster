import { sql } from 'drizzle-orm'

import { db, readDb } from './connection'
import type {
  AlertItem,
  AlertsResult,
  DashboardMetrics,
  DatabaseMetrics,
  IndexSizeRow,
  LongRunningQueryRow,
  ReplicationSlotRow,
  TableSizeRow,
} from './types'

// Real-time database monitoring and alerting
export class DatabaseMonitoring {
  // Performance dashboard data
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Overview metrics
    const overview = await this.getOverviewMetrics()

    // Performance metrics
    const performance = await this.getPerformanceMetrics()

    // Connection metrics
    const connections = await this.getConnectionMetrics()

    // Query metrics
    const queries = await this.getQueryMetrics()

    // Storage metrics
    const storage = await this.getStorageMetrics()

    // Replication metrics
    const replication = await this.getReplicationMetrics()

    return {
      overview,
      performance,
      connections,
      queries,
      storage,
      replication,
    }
  }

  // Overview metrics
  private static async getOverviewMetrics(): Promise<DatabaseMetrics> {
    const [dbSize] = await readDb.execute(sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
    `)

    const [uptime] = await readDb.execute(sql`
      SELECT 
        now() - pg_postmaster_start_time() as uptime,
        pg_postmaster_start_time() as start_time
    `)

    const [version] = await readDb.execute(sql`
      SELECT version() as postgresql_version
    `)

    const [activeUsers] = await readDb.execute(sql`
      SELECT count(DISTINCT user_id) as active_users_24h
      FROM learning_events 
      WHERE timestamp >= now() - interval '24 hours'
    `)

    return {
      database_size: (dbSize as DatabaseMetrics | undefined)?.database_size,
      uptime: (uptime as DatabaseMetrics | undefined)?.uptime,
      start_time: (uptime as DatabaseMetrics | undefined)?.start_time,
      postgresql_version: (version as DatabaseMetrics | undefined)?.postgresql_version,
      active_users_24h: (activeUsers as DatabaseMetrics | undefined)?.active_users_24h ?? 0,
    }
  }

  // Performance metrics
  private static async getPerformanceMetrics(): Promise<DatabaseMetrics> {
    // Cache hit ratio
    const [cacheHit] = await readDb.execute(sql`
      SELECT 
        round(
          (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
        ) as cache_hit_ratio
      FROM pg_statio_user_tables
    `)

    // Index hit ratio
    const [indexHit] = await readDb.execute(sql`
      SELECT 
        round(
          (sum(idx_blks_hit) / (sum(idx_blks_hit) + sum(idx_blks_read))) * 100, 2
        ) as index_hit_ratio
      FROM pg_statio_user_indexes
    `)

    // Transaction statistics
    const [transactions] = await readDb.execute(sql`
      SELECT 
        xact_commit,
        xact_rollback,
        round((xact_commit / (xact_commit + xact_rollback)) * 100, 2) as commit_ratio
      FROM pg_stat_database 
      WHERE datname = current_database()
    `)

    // Checkpoint statistics
    const [checkpoints] = await readDb.execute(sql`
      SELECT 
        checkpoints_timed,
        checkpoints_req,
        checkpoint_write_time,
        checkpoint_sync_time
      FROM pg_stat_bgwriter
    `)

    return {
      cache_hit_ratio: (cacheHit as DatabaseMetrics | undefined)?.cache_hit_ratio ?? 0,
      index_hit_ratio: (indexHit as DatabaseMetrics | undefined)?.index_hit_ratio ?? 0,
      commit_ratio: (transactions as DatabaseMetrics | undefined)?.commit_ratio ?? 0,
      xact_commit: (transactions as DatabaseMetrics | undefined)?.xact_commit ?? 0,
      xact_rollback: (transactions as DatabaseMetrics | undefined)?.xact_rollback ?? 0,
      checkpoints_timed: (checkpoints as DatabaseMetrics | undefined)?.checkpoints_timed ?? 0,
      checkpoints_req: (checkpoints as DatabaseMetrics | undefined)?.checkpoints_req ?? 0,
      checkpoint_write_time:
        (checkpoints as DatabaseMetrics | undefined)?.checkpoint_write_time ?? 0,
      checkpoint_sync_time: (checkpoints as DatabaseMetrics | undefined)?.checkpoint_sync_time ?? 0,
    }
  }

  // Connection metrics
  private static async getConnectionMetrics(): Promise<
    DatabaseMetrics & { connectionUtilization: number }
  > {
    const [connections] = await readDb.execute(sql`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `)

    const [maxConnections] = await readDb.execute(sql`
      SELECT setting::int as max_connections
      FROM pg_settings 
      WHERE name = 'max_connections'
    `)

    const connectionsData = connections as DatabaseMetrics | undefined
    const maxConnectionsData = maxConnections as DatabaseMetrics | undefined

    const connectionUtilization =
      connectionsData?.total_connections != null && maxConnectionsData?.max_connections != null
        ? (Number(connectionsData.total_connections) / Number(maxConnectionsData.max_connections)) *
          100
        : 0

    return {
      total_connections: connectionsData?.total_connections ?? 0,
      active_connections: connectionsData?.active_connections ?? 0,
      idle_connections: connectionsData?.idle_connections ?? 0,
      idle_in_transaction: connectionsData?.idle_in_transaction ?? 0,
      waiting_connections: connectionsData?.waiting_connections ?? 0,
      max_connections: maxConnectionsData?.max_connections ?? 0,
      connectionUtilization: Math.round(connectionUtilization * 100) / 100,
    }
  }

  // Query metrics
  private static async getQueryMetrics(): Promise<
    DatabaseMetrics & { longRunningQueries: LongRunningQueryRow[] }
  > {
    // Query statistics from pg_stat_statements
    const [queryStats] = await readDb.execute(sql`
      SELECT 
        count(*) as total_queries,
        count(*) FILTER (WHERE mean_exec_time > 1000) as slow_queries,
        round(avg(mean_exec_time), 2) as avg_execution_time,
        round(max(mean_exec_time), 2) as max_execution_time,
        sum(calls) as total_calls,
        round(sum(total_exec_time), 2) as total_execution_time
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    `)

    // Long running queries
    const longRunningQueries = await readDb.execute(sql`
      SELECT 
        pid,
        now() - query_start as duration,
        left(query, 100) as query_preview,
        state,
        usename
      FROM pg_stat_activity
      WHERE (now() - query_start) > interval '30 seconds'
        AND state != 'idle'
        AND query NOT LIKE '%pg_stat_activity%'
      ORDER BY duration DESC
      LIMIT 5
    `)

    const queryStatsData = queryStats as DatabaseMetrics | undefined

    return {
      total_queries: queryStatsData?.total_queries ?? 0,
      slow_queries: queryStatsData?.slow_queries ?? 0,
      avg_execution_time: queryStatsData?.avg_execution_time ?? 0,
      max_execution_time: queryStatsData?.max_execution_time ?? 0,
      total_calls: queryStatsData?.total_calls ?? 0,
      total_execution_time: queryStatsData?.total_execution_time ?? 0,
      longRunningQueries: (longRunningQueries as unknown as LongRunningQueryRow[]) ?? [],
    }
  }

  // Storage metrics
  private static async getStorageMetrics(): Promise<{
    tableSizes: TableSizeRow[]
    indexSizes: IndexSizeRow[]
    tablesWithBloat: number
    avgDeadTuples: number
    maxDeadTuples: number
  }> {
    // Table sizes
    const tableSizes = await readDb.execute(sql`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `)

    // Index sizes
    const indexSizes = await readDb.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 10
    `)

    // Bloat analysis
    const [bloatStats] = await readDb.execute(sql`
      SELECT 
        count(*) as tables_with_bloat,
        avg(n_dead_tup) as avg_dead_tuples,
        max(n_dead_tup) as max_dead_tuples
      FROM pg_stat_user_tables
      WHERE n_dead_tup > 1000
    `)

    const bloatStatsData = bloatStats as DatabaseMetrics | undefined

    return {
      tableSizes: (tableSizes as unknown as TableSizeRow[]) ?? [],
      indexSizes: (indexSizes as unknown as IndexSizeRow[]) ?? [],
      tablesWithBloat: bloatStatsData?.tables_with_bloat ?? 0,
      avgDeadTuples: bloatStatsData?.avg_dead_tuples ?? 0,
      maxDeadTuples: bloatStatsData?.max_dead_tuples ?? 0,
    }
  }

  // Replication metrics
  private static async getReplicationMetrics(): Promise<{
    role: string
    lagMs?: number
    lastReplay?: Date
    replicationSlots?: ReplicationSlotRow[]
    error?: string
  }> {
    try {
      // Check if this is a primary or replica
      const [replicationRole] = await readDb.execute(sql`
        SELECT pg_is_in_recovery() as is_replica
      `)

      const replicationRoleData = replicationRole as DatabaseMetrics | undefined

      if (replicationRoleData?.is_replica === true) {
        // Replica metrics
        const [replicaLag] = await readDb.execute(sql`
          SELECT 
            EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) * 1000 as lag_ms,
            pg_last_xact_replay_timestamp() as last_replay
        `)

        const replicaLagData = replicaLag as DatabaseMetrics | undefined

        return {
          role: 'replica',
          lagMs: replicaLagData?.lag_ms ?? 0,
          lastReplay: replicaLagData?.last_replay,
        }
      } else {
        // Primary metrics
        const replicationSlots = await readDb.execute(sql`
          SELECT 
            slot_name,
            slot_type,
            database,
            active,
            pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag_size
          FROM pg_replication_slots
        `)

        return {
          role: 'primary',
          replicationSlots: (replicationSlots as unknown as ReplicationSlotRow[]) ?? [],
        }
      }
    } catch (error) {
      return {
        role: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Alert system
  static async checkAlerts(): Promise<AlertsResult> {
    const critical: AlertItem[] = []
    const warning: AlertItem[] = []
    const info: AlertItem[] = []

    // Check connection utilization
    const connectionMetrics = await this.getConnectionMetrics()
    if (connectionMetrics.connectionUtilization > 90) {
      critical.push({
        type: 'high_connection_utilization',
        message: `Connection utilization at ${connectionMetrics.connectionUtilization}%`,
        value: connectionMetrics.connectionUtilization,
        threshold: 90,
      })
    } else if (connectionMetrics.connectionUtilization > 75) {
      warning.push({
        type: 'moderate_connection_utilization',
        message: `Connection utilization at ${connectionMetrics.connectionUtilization}%`,
        value: connectionMetrics.connectionUtilization,
        threshold: 75,
      })
    }

    // Check cache hit ratio
    const performanceMetrics = await this.getPerformanceMetrics()
    const cacheHitRatio = performanceMetrics.cache_hit_ratio ?? 0
    if (cacheHitRatio < 90) {
      warning.push({
        type: 'low_cache_hit_ratio',
        message: `Cache hit ratio at ${cacheHitRatio}%`,
        value: cacheHitRatio,
        threshold: 90,
      })
    }

    // Check for long-running queries
    const queryMetrics = await this.getQueryMetrics()
    if (queryMetrics.longRunningQueries.length > 0) {
      warning.push({
        type: 'long_running_queries',
        message: `${queryMetrics.longRunningQueries.length} long-running queries detected`,
        value: queryMetrics.longRunningQueries.length,
        queries: queryMetrics.longRunningQueries,
      })
    }

    // Check slow queries
    const slowQueries = queryMetrics.slow_queries ?? 0
    if (slowQueries > 10) {
      warning.push({
        type: 'high_slow_queries',
        message: `${slowQueries} slow queries detected`,
        value: slowQueries,
        threshold: 10,
      })
    }

    // Check replication lag
    const replicationMetrics = await this.getReplicationMetrics()
    if (replicationMetrics.role === 'replica' && (replicationMetrics.lagMs ?? 0) > 5000) {
      const lagMs = replicationMetrics.lagMs ?? 0
      critical.push({
        type: 'high_replication_lag',
        message: `Replication lag at ${Math.round(lagMs)}ms`,
        value: lagMs,
        threshold: 5000,
      })
    }

    // Check table bloat
    const storageMetrics = await this.getStorageMetrics()
    if (storageMetrics.tablesWithBloat > 5) {
      info.push({
        type: 'table_bloat_detected',
        message: `${storageMetrics.tablesWithBloat} tables with significant bloat`,
        value: storageMetrics.tablesWithBloat,
        recommendation: 'Consider running VACUUM ANALYZE',
      })
    }

    return { critical, warning, info }
  }

  // Generate monitoring report
  static async generateReport(): Promise<string> {
    try {
      const metrics = await this.getDashboardMetrics()
      const alerts = await this.checkAlerts()

      const report = `
# Database Monitoring Report
Generated: ${new Date().toISOString()}

## Overview
- Database Size: ${metrics.overview.database_size ?? 'N/A'}
- Uptime: ${metrics.overview.uptime ?? 'N/A'}
- Active Users (24h): ${metrics.overview.active_users_24h ?? 0}

## Performance
- Cache Hit Ratio: ${metrics.performance.cache_hit_ratio ?? 0}%
- Index Hit Ratio: ${metrics.performance.index_hit_ratio ?? 0}%
- Commit Ratio: ${metrics.performance.commit_ratio ?? 0}%

## Connections
- Total: ${metrics.connections.total_connections ?? 0}/${metrics.connections.max_connections ?? 0}
- Active: ${metrics.connections.active_connections ?? 0}
- Utilization: ${metrics.connections.connectionUtilization}%

## Queries
- Total Queries: ${metrics.queries.total_queries ?? 0}
- Slow Queries: ${metrics.queries.slow_queries ?? 0}
- Avg Execution Time: ${metrics.queries.avg_execution_time ?? 0}ms

## Alerts
### Critical (${alerts.critical.length})
${alerts.critical.map((alert) => `- ${alert.message}`).join('\n')}

### Warning (${alerts.warning.length})
${alerts.warning.map((alert) => `- ${alert.message}`).join('\n')}

### Info (${alerts.info.length})
${alerts.info.map((alert) => `- ${alert.message}`).join('\n')}

## Top Tables by Size
${metrics.storage.tableSizes
  .slice(0, 5)
  .map((table) => `- ${table.tablename}: ${table.size}`)
  .join('\n')}

## Recommendations
${this.generateRecommendations(metrics, alerts)}
      `

      return report.trim()
    } catch (error) {
      return `Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  // Generate performance recommendations
  private static generateRecommendations(metrics: DashboardMetrics, _alerts: AlertsResult): string {
    const recommendations: string[] = []

    // Cache hit ratio recommendations
    if ((metrics.performance.cache_hit_ratio ?? 0) < 95) {
      recommendations.push('- Consider increasing shared_buffers for better cache performance')
    }

    // Connection recommendations
    if (metrics.connections.connectionUtilization > 80) {
      recommendations.push('- Consider implementing connection pooling with PgBouncer')
    }

    // Query performance recommendations
    if ((metrics.queries.slow_queries ?? 0) > 5) {
      recommendations.push('- Review and optimize slow queries using EXPLAIN ANALYZE')
      recommendations.push('- Consider adding indexes for frequently queried columns')
    }

    // Storage recommendations
    if (metrics.storage.tablesWithBloat > 3) {
      recommendations.push('- Schedule regular VACUUM ANALYZE operations')
      recommendations.push('- Consider auto-vacuum tuning for high-traffic tables')
    }

    // Replication recommendations
    if (metrics.replication.role === 'replica' && (metrics.replication.lagMs ?? 0) > 1000) {
      recommendations.push('- Check network connectivity between primary and replica')
      recommendations.push('- Consider increasing wal_sender_timeout and wal_receiver_timeout')
    }

    return recommendations.length > 0
      ? recommendations.join('\n')
      : '- Database performance is optimal'
  }
}

// Automated maintenance scheduler
export class MaintenanceScheduler {
  // Schedule automated maintenance tasks
  static getMaintenanceSchedule(): string {
    return `
# Database Maintenance Schedule

## Daily Tasks (2 AM)
0 2 * * * /usr/local/bin/maintenance-daily.sh

## Weekly Tasks (Sunday 3 AM)
0 3 * * 0 /usr/local/bin/maintenance-weekly.sh

## Monthly Tasks (1st of month, 4 AM)
0 4 1 * * /usr/local/bin/maintenance-monthly.sh

## Maintenance Scripts:

### maintenance-daily.sh
#!/bin/bash
# Daily maintenance tasks
echo "Starting daily maintenance: $(date)"

# Update table statistics
psql -d drivemaster_prod -c "ANALYZE;"

# Refresh materialized views
psql -d drivemaster_prod -c "SELECT refresh_analytics_views();"

# Check for long-running queries
psql -d drivemaster_prod -c "
  SELECT pid, now() - query_start as duration, query 
  FROM pg_stat_activity 
  WHERE (now() - query_start) > interval '1 hour' 
    AND state != 'idle';
"

# Generate monitoring report
node /app/scripts/generate-monitoring-report.js

echo "Daily maintenance completed: $(date)"

### maintenance-weekly.sh
#!/bin/bash
# Weekly maintenance tasks
echo "Starting weekly maintenance: $(date)"

# Vacuum analyze all tables
psql -d drivemaster_prod -c "VACUUM ANALYZE;"

# Reindex heavily used indexes
psql -d drivemaster_prod -c "REINDEX INDEX CONCURRENTLY idx_knowledge_states_user_concept;"
psql -d drivemaster_prod -c "REINDEX INDEX CONCURRENTLY idx_learning_events_user_timestamp;"

# Check for unused indexes
psql -d drivemaster_prod -c "
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  ORDER BY schemaname, tablename;
"

# Update query statistics
psql -d drivemaster_prod -c "SELECT pg_stat_statements_reset();"

echo "Weekly maintenance completed: $(date)"

### maintenance-monthly.sh
#!/bin/bash
# Monthly maintenance tasks
echo "Starting monthly maintenance: $(date)"

# Full database backup
pg_dump -h localhost -U drivemaster -d drivemaster_prod -Fc -f /backups/monthly/drivemaster_$(date +%Y%m).backup

# Analyze table bloat
psql -d drivemaster_prod -c "
  SELECT 
    schemaname, tablename, n_dead_tup, n_live_tup,
    CASE WHEN n_live_tup > 0 
         THEN round((n_dead_tup::float / n_live_tup::float) * 100, 2)
         ELSE 0 END as bloat_percentage
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 1000
  ORDER BY bloat_percentage DESC;
"

# Check database size growth
psql -d drivemaster_prod -c "
  SELECT 
    pg_size_pretty(pg_database_size(current_database())) as current_size,
    pg_size_pretty(pg_total_relation_size('learning_events')) as events_table_size,
    pg_size_pretty(pg_total_relation_size('knowledge_states')) as knowledge_states_size;
"

# Performance tuning recommendations
node /app/scripts/generate-tuning-recommendations.js

echo "Monthly maintenance completed: $(date)"
    `
  }

  // Execute maintenance task
  static async executeMaintenanceTask(task: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    // Use proper logging instead of console
    // console.log(`Starting ${task} maintenance task...`)

    switch (task) {
      case 'daily':
        await this.dailyMaintenance()
        break
      case 'weekly':
        await this.weeklyMaintenance()
        break
      case 'monthly':
        await this.monthlyMaintenance()
        break
    }

    // Use proper logging instead of console
    // console.log(`✅ ${task} maintenance completed successfully`)
  }

  // Daily maintenance tasks
  private static async dailyMaintenance(): Promise<void> {
    // Update table statistics
    await db.execute(sql`ANALYZE`)

    // Refresh materialized views (if they exist)
    try {
      await db.execute(sql`SELECT refresh_analytics_views()`)
    } catch (error) {
      // Use proper logging instead of console
      // console.warn('Materialized views not yet created, skipping refresh')
    }

    // Generate monitoring report
    await DatabaseMonitoring.generateReport()
    // Use proper logging instead of console
    // console.log('Daily Monitoring Report:\n', report)
  }

  // Weekly maintenance tasks
  private static async weeklyMaintenance(): Promise<void> {
    // Vacuum analyze all tables
    await db.execute(sql`VACUUM ANALYZE`)

    // Check for unused indexes
    const unusedIndexes = await readDb.execute(sql`
      SELECT schemaname, tablename, indexname, idx_scan
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexname NOT LIKE '%_pkey'
      ORDER BY schemaname, tablename
    `)

    if (unusedIndexes.length > 0) {
      // Use proper logging instead of console
      // console.log('Unused indexes detected:')
      unusedIndexes.forEach((_index) => {
        // Use proper logging instead of console
        // console.log(`  - ${index.schemaname}.${index.indexname} on ${index.tablename}`)
      })
    }
  }

  // Monthly maintenance tasks
  private static async monthlyMaintenance(): Promise<void> {
    // Analyze table bloat
    const bloatAnalysis = await readDb.execute(sql`
      SELECT 
        schemaname, tablename, n_dead_tup, n_live_tup,
        CASE WHEN n_live_tup > 0 
             THEN round((n_dead_tup::float / n_live_tup::float) * 100, 2)
             ELSE 0 END as bloat_percentage
      FROM pg_stat_user_tables
      WHERE n_dead_tup > 1000
      ORDER BY bloat_percentage DESC
    `)

    // Use proper logging instead of console
    // console.log('Table bloat analysis:')
    bloatAnalysis.forEach((_table) => {
      // Use proper logging instead of console
      // console.log(
      //   `  ${table.tablename}: ${table.bloat_percentage}% bloat (${table.n_dead_tup} dead tuples)`,
      // )
    })

    // Database size analysis
    await readDb.execute(sql`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as current_size,
        pg_size_pretty(pg_total_relation_size('learning_events')) as events_table_size,
        pg_size_pretty(pg_total_relation_size('knowledge_states')) as knowledge_states_size
    `)

    // Size data is available but not used in current implementation

    // Use proper logging instead of console
    // console.log('Database size analysis:')
    // console.log(`  Total database size: ${sizeData?.current_size ?? 'N/A'}`)
    // console.log(`  Learning events table: ${sizeData?.events_table_size ?? 'N/A'}`)
    // console.log(`  Knowledge states table: ${sizeData?.knowledge_states_size ?? 'N/A'}`)
  }
}
