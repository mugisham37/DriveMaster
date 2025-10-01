// Database query result types
export interface MigrationRow {
  hash: string
  created_at: number
  applied_at: Date | null
  rolled_back_at: Date | null
}

export interface DatabaseMetrics {
  database_size?: string
  uptime?: string
  start_time?: Date
  postgresql_version?: string
  active_users_24h?: number
  cache_hit_ratio?: number
  index_hit_ratio?: number
  commit_ratio?: number
  xact_commit?: number
  xact_rollback?: number
  checkpoints_timed?: number
  checkpoints_req?: number
  checkpoint_write_time?: number
  checkpoint_sync_time?: number
  total_connections?: number
  active_connections?: number
  idle_connections?: number
  idle_in_transaction?: number
  waiting_connections?: number
  max_connections?: number
  total_queries?: number
  slow_queries?: number
  avg_execution_time?: number
  max_execution_time?: number
  total_calls?: number
  total_execution_time?: number
  tables_with_bloat?: number
  avg_dead_tuples?: number
  max_dead_tuples?: number
  is_replica?: boolean
  lag_ms?: number
  last_replay?: Date
}

export interface TableSizeRow {
  schemaname: string
  tablename: string
  size: string
  size_bytes?: number
}

export interface IndexSizeRow {
  schemaname: string
  tablename: string
  indexname: string
  size: string
}

export interface LongRunningQueryRow {
  pid: number
  duration: string
  query_preview: string
  state: string
  usename: string
}

export interface ReplicationSlotRow {
  slot_name: string
  slot_type: string
  database: string
  active: boolean
  lag_size: string
}

export interface BloatAnalysisRow {
  schemaname: string
  tablename: string
  n_dead_tup: number
  n_live_tup: number
  bloat_percentage: number
}

export interface UnusedIndexRow {
  schemaname: string
  tablename: string
  indexname: string
  idx_scan: number
}

export interface SizeAnalysisRow {
  current_size: string
  events_table_size: string
  knowledge_states_size: string
}

export interface AlertItem {
  type: string
  message: string
  value?: number | string
  threshold?: number
  queries?: LongRunningQueryRow[]
  recommendation?: string
  error?: string
}

export interface AlertsResult {
  critical: AlertItem[]
  warning: AlertItem[]
  info: AlertItem[]
}

export interface DashboardMetrics {
  overview: DatabaseMetrics
  performance: DatabaseMetrics
  connections: DatabaseMetrics & { connectionUtilization: number }
  queries: DatabaseMetrics & { longRunningQueries: LongRunningQueryRow[] }
  storage: {
    tableSizes: TableSizeRow[]
    indexSizes: IndexSizeRow[]
    tablesWithBloat: number
    avgDeadTuples: number
    maxDeadTuples: number
  }
  replication: {
    role: string
    lagMs?: number
    lastReplay?: Date
    replicationSlots?: ReplicationSlotRow[]
    error?: string
  }
}
