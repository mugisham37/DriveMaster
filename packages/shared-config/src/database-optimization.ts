import { performance } from 'perf_hooks'

import { Pool, PoolClient } from 'pg'

export interface DatabaseConfig {
  primary: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
  readReplicas: Array<{
    host: string
    port: number
    database: string
    user: string
    password: string
    weight?: number // Load balancing weight
  }>
  pooling: {
    max: number
    min: number
    idleTimeoutMillis: number
    connectionTimeoutMillis: number
    acquireTimeoutMillis: number
    maxUses: number
  }
  optimization: {
    statementTimeout: number
    queryTimeout: number
    slowQueryThreshold: number
    enableQueryLogging: boolean
    enableExplainAnalyze: boolean
  }
}

export interface QueryMetrics {
  query: string
  duration: number
  rows: number
  timestamp: number
  database: 'primary' | 'replica'
  cached: boolean
  planTime?: number | undefined
  executionTime?: number | undefined
}

export interface ConnectionPoolStats {
  totalConnections: number
  idleConnections: number
  waitingClients: number
  maxConnections: number
  database: string
}

interface QueryResult {
  rows: unknown[]
  rowCount: number | null
  command: string
  fields: unknown[]
}

interface CacheEntry {
  result: QueryResult
  timestamp: number
  ttl: number
}

export class DatabaseOptimizer {
  private primaryPool!: Pool
  private replicaPools: Pool[] = []
  private config: DatabaseConfig
  private queryMetrics: QueryMetrics[] = []
  private queryCache: Map<string, CacheEntry> = new Map()
  private replicaWeights: number[] = []

  constructor(config: DatabaseConfig) {
    this.config = config
    this.initializePools()
    this.startMetricsCollection()
  }

  /**
   * Initialize connection pools
   */
  private initializePools(): void {
    // Primary database pool
    this.primaryPool = new Pool({
      host: this.config.primary.host,
      port: this.config.primary.port,
      database: this.config.primary.database,
      user: this.config.primary.user,
      password: this.config.primary.password,
      max: this.config.pooling.max,
      min: this.config.pooling.min,
      idleTimeoutMillis: this.config.pooling.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.pooling.connectionTimeoutMillis,
      maxUses: this.config.pooling.maxUses,
      statement_timeout: this.config.optimization.statementTimeout,
      query_timeout: this.config.optimization.queryTimeout,
    })

    // Read replica pools
    this.config.readReplicas.forEach((replica) => {
      const pool = new Pool({
        host: replica.host,
        port: replica.port,
        database: replica.database,
        user: replica.user,
        password: replica.password,
        max: Math.floor(this.config.pooling.max * 0.7), // Fewer connections for replicas
        min: Math.floor(this.config.pooling.min * 0.5),
        idleTimeoutMillis: this.config.pooling.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.pooling.connectionTimeoutMillis,
        maxUses: this.config.pooling.maxUses,
        statement_timeout: this.config.optimization.statementTimeout,
        query_timeout: this.config.optimization.queryTimeout,
      })

      this.replicaPools.push(pool)
      this.replicaWeights.push(replica.weight ?? 1)
    })

    this.setupPoolEventHandlers()
  }

  /**
   * Execute query with intelligent routing
   */
  async query(
    sql: string,
    params?: unknown[],
    options?: {
      useReplica?: boolean | undefined
      cacheTtl?: number | undefined
      skipCache?: boolean | undefined
      explainAnalyze?: boolean | undefined
    },
  ): Promise<QueryResult> {
    const startTime = performance.now()
    const cacheKey = this.generateCacheKey(sql, params)

    // Check cache first
    if (
      options?.skipCache !== true &&
      typeof options?.cacheTtl === 'number' &&
      options.cacheTtl > 0
    ) {
      const cached = this.queryCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.recordMetrics({
          query: sql,
          duration: performance.now() - startTime,
          rows: cached.result.rowCount ?? 0,
          timestamp: Date.now(),
          database: 'replica',
          cached: true,
        })
        return cached.result
      }
    }

    // Determine which pool to use
    const useReplica = options?.useReplica ?? this.shouldUseReplica(sql)
    const pool = useReplica ? this.selectReplicaPool() : this.primaryPool
    const database = useReplica ? 'replica' : 'primary'

    try {
      const result: QueryResult = (await pool.query(sql, params)) as QueryResult
      let planTime: number | undefined
      let executionTime: number | undefined

      // Execute EXPLAIN ANALYZE if requested and enabled
      if (options?.explainAnalyze === true && this.config.optimization.enableExplainAnalyze) {
        try {
          const explainResult = (await pool.query(
            `EXPLAIN (ANALYZE, BUFFERS) ${sql}`,
            params,
          )) as QueryResult

          // Extract timing information from explain output
          const planRow = explainResult.rows.find((row: unknown) => {
            if (typeof row === 'object' && row !== null && 'QUERY PLAN' in row) {
              const queryPlan = (row as { 'QUERY PLAN': unknown })['QUERY PLAN']
              return typeof queryPlan === 'string' && queryPlan.includes('Planning Time:')
            }
            return false
          })

          const execRow = explainResult.rows.find((row: unknown) => {
            if (typeof row === 'object' && row !== null && 'QUERY PLAN' in row) {
              const queryPlan = (row as { 'QUERY PLAN': unknown })['QUERY PLAN']
              return typeof queryPlan === 'string' && queryPlan.includes('Execution Time:')
            }
            return false
          })

          if (
            planRow !== undefined &&
            typeof planRow === 'object' &&
            planRow !== null &&
            'QUERY PLAN' in planRow
          ) {
            const queryPlan = (planRow as { 'QUERY PLAN': string })['QUERY PLAN']
            if (typeof queryPlan === 'string' && queryPlan.length > 0) {
              const match = queryPlan.match(/Planning Time: ([\d.]+) ms/)
              const matchResult = match?.[1]
              if (typeof matchResult === 'string' && matchResult.length > 0) {
                planTime = parseFloat(matchResult)
              }
            }
          }

          if (
            execRow !== undefined &&
            typeof execRow === 'object' &&
            execRow !== null &&
            'QUERY PLAN' in execRow
          ) {
            const queryPlan = (execRow as { 'QUERY PLAN': string })['QUERY PLAN']
            if (typeof queryPlan === 'string' && queryPlan.length > 0) {
              const match = queryPlan.match(/Execution Time: ([\d.]+) ms/)
              const matchResult = match?.[1]
              if (typeof matchResult === 'string' && matchResult.length > 0) {
                executionTime = parseFloat(matchResult)
              }
            }
          }
        } catch (explainError) {
          // Ignore explain errors, continue with main query
        }
      }

      const duration = performance.now() - startTime

      // Cache result if TTL is specified
      if (
        typeof options?.cacheTtl === 'number' &&
        options.cacheTtl > 0 &&
        options?.skipCache !== true
      ) {
        this.queryCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          ttl: options.cacheTtl,
        })
      }

      // Record metrics
      this.recordMetrics({
        query: sql,
        duration,
        rows: result.rowCount ?? 0,
        timestamp: Date.now(),
        database,
        cached: false,
        planTime: typeof planTime === 'number' ? planTime : undefined,
        executionTime: typeof executionTime === 'number' ? executionTime : undefined,
      })

      // Log slow queries
      if (duration > this.config.optimization.slowQueryThreshold) {
        // eslint-disable-next-line no-console
        console.warn(`Slow query detected (${duration.toFixed(2)}ms):`, {
          sql: sql.substring(0, 200),
          params: params?.slice(0, 5),
          duration,
          database,
        })
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      // eslint-disable-next-line no-console
      console.error('Database query error:', {
        sql: sql.substring(0, 200),
        params: params?.slice(0, 5),
        error: errorMessage,
        database,
      })
      throw error
    }
  }

  /**
   * Execute transaction with retry logic
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options?: { retries?: number | undefined; useReplica?: boolean | undefined },
  ): Promise<T> {
    const maxRetries = options?.retries ?? 3
    const pool = options?.useReplica === true ? this.selectReplicaPool() : this.primaryPool

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const client = await pool.connect()

      try {
        await client.query('BEGIN')
        const result = await callback(client)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')

        if (attempt === maxRetries || !this.isRetryableError(error)) {
          throw error
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise((resolve) => setTimeout(resolve, delay))
      } finally {
        client.release()
      }
    }

    throw new Error('Transaction failed after maximum retries')
  }

  /**
   * Batch execute multiple queries
   */
  async batchQuery(
    queries: Array<{ sql: string; params?: unknown[] }>,
    options?: { useTransaction?: boolean | undefined; useReplica?: boolean | undefined },
  ): Promise<QueryResult[]> {
    if (options?.useTransaction === true) {
      return this.transaction(
        async (client) => {
          const results: QueryResult[] = []
          for (const query of queries) {
            const result = (await client.query(query.sql, query.params)) as QueryResult
            results.push(result)
          }
          return results
        },
        { useReplica: options.useReplica === true ? true : undefined },
      )
    } else {
      const promises = queries.map((query) =>
        this.query(query.sql, query.params, {
          useReplica: options?.useReplica === true ? true : undefined,
        }),
      )
      return Promise.all(promises)
    }
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): ConnectionPoolStats[] {
    const stats: ConnectionPoolStats[] = []

    // Primary pool stats
    stats.push({
      totalConnections: this.primaryPool.totalCount,
      idleConnections: this.primaryPool.idleCount,
      waitingClients: this.primaryPool.waitingCount,
      maxConnections: this.config.pooling.max,
      database: 'primary',
    })

    // Replica pool stats
    this.replicaPools.forEach((pool, index) => {
      stats.push({
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount,
        maxConnections: Math.floor(this.config.pooling.max * 0.7),
        database: `replica-${index}`,
      })
    })

    return stats
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(timeWindow: number = 300000): {
    totalQueries: number
    averageResponseTime: number
    slowQueries: number
    slowQueryRate: number
    cacheHitRate: number
    primaryQueries: number
    replicaQueries: number
    replicaUsageRate: number
    topSlowQueries: Array<{
      query: string
      duration: number
      rows: number
      database: string
      timestamp: number
    }>
  } {
    // Default 5 minutes
    const cutoff = Date.now() - timeWindow
    const recentMetrics = this.queryMetrics.filter((m) => m.timestamp > cutoff)

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageResponseTime: 0,
        slowQueries: 0,
        slowQueryRate: 0,
        cacheHitRate: 0,
        primaryQueries: 0,
        replicaQueries: 0,
        replicaUsageRate: 0,
        topSlowQueries: [],
      }
    }

    const slowQueries = recentMetrics.filter(
      (m) => m.duration > this.config.optimization.slowQueryThreshold,
    )
    const cachedQueries = recentMetrics.filter((m) => m.cached)
    const primaryQueries = recentMetrics.filter((m) => m.database === 'primary')
    const replicaQueries = recentMetrics.filter((m) => m.database === 'replica')

    return {
      totalQueries: recentMetrics.length,
      averageResponseTime:
        recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length,
      slowQueries: slowQueries.length,
      slowQueryRate: slowQueries.length / recentMetrics.length,
      cacheHitRate: cachedQueries.length / recentMetrics.length,
      primaryQueries: primaryQueries.length,
      replicaQueries: replicaQueries.length,
      replicaUsageRate: replicaQueries.length / recentMetrics.length,
      topSlowQueries: this.getTopSlowQueries(recentMetrics, 5),
    }
  }

  /**
   * Optimize query cache
   */
  optimizeCache(): void {
    const now = Date.now()
    let removedCount = 0

    // Remove expired entries
    for (const [key, value] of this.queryCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.queryCache.delete(key)
        removedCount++
      }
    }

    // If cache is still too large, remove oldest entries
    const maxCacheSize = 1000
    if (this.queryCache.size > maxCacheSize) {
      const entries = Array.from(this.queryCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp,
      )

      const toRemove = entries.slice(0, this.queryCache.size - maxCacheSize)
      toRemove.forEach(([key]) => {
        this.queryCache.delete(key)
        removedCount++
      })
    }

    if (removedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`Optimized query cache: removed ${removedCount} expired entries`)
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await Promise.all([this.primaryPool.end(), ...this.replicaPools.map((pool) => pool.end())])
  }

  // Private methods

  /**
   * Determine if query should use read replica
   */
  private shouldUseReplica(sql: string): boolean {
    const readOnlyPatterns = [/^\s*SELECT\s/i, /^\s*WITH\s.*SELECT\s/i, /^\s*EXPLAIN\s/i]

    const writePatterns = [/^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE)\s/i]

    // Check for write operations first
    if (writePatterns.some((pattern) => pattern.test(sql))) {
      return false
    }

    // Check for read operations
    if (readOnlyPatterns.some((pattern) => pattern.test(sql))) {
      return this.replicaPools.length > 0
    }

    // Default to primary for unknown query types
    return false
  }

  /**
   * Select replica pool using weighted round-robin
   */
  private selectReplicaPool(): Pool {
    if (this.replicaPools.length === 0) {
      return this.primaryPool
    }

    if (this.replicaPools.length === 1) {
      const pool = this.replicaPools[0]
      if (!pool) {
        return this.primaryPool
      }
      return pool
    }

    // Simple weighted selection (can be improved with proper round-robin)
    const totalWeight = this.replicaWeights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < this.replicaPools.length; i++) {
      const weight = this.replicaWeights[i]
      const pool = this.replicaPools[i]

      if (weight !== undefined && pool !== undefined) {
        random -= weight
        if (random <= 0) {
          return pool
        }
      }
    }

    const fallbackPool = this.replicaPools[0]
    return fallbackPool ?? this.primaryPool
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(sql: string, params?: unknown[]): string {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim()
    const paramsStr = params ? JSON.stringify(params) : ''
    return `${normalizedSql}:${paramsStr}`
  }

  /**
   * Record query metrics
   */
  private recordMetrics(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics)

    // Keep only last 1000 metrics in memory
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000)
    }

    // Log query if enabled
    if (this.config.optimization.enableQueryLogging) {
      // eslint-disable-next-line no-console
      console.log('Query executed:', {
        duration: `${metrics.duration.toFixed(2)}ms`,
        rows: metrics.rows,
        database: metrics.database,
        cached: metrics.cached,
        sql: metrics.query.substring(0, 100),
      })
    }
  }

  /**
   * Get top slow queries
   */
  private getTopSlowQueries(
    metrics: QueryMetrics[],
    limit: number,
  ): Array<{
    query: string
    duration: number
    rows: number
    database: string
    timestamp: number
  }> {
    return metrics
      .filter((m) => !m.cached)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map((m) => ({
        query: m.query.substring(0, 200),
        duration: m.duration,
        rows: m.rows,
        database: m.database,
        timestamp: m.timestamp,
      }))
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const retryableCodes = [
      '40001', // serialization_failure
      '40P01', // deadlock_detected
      '53300', // too_many_connections
      '08006', // connection_failure
      '08001', // sql_client_unable_to_establish_sql_connection
    ]

    if (error !== null && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as { code: unknown }).code
      return typeof errorCode === 'string' && retryableCodes.includes(errorCode)
    }

    return false
  }

  /**
   * Setup pool event handlers
   */
  private setupPoolEventHandlers(): void {
    const setupHandlers = (pool: Pool, name: string): void => {
      pool.on('connect', () => {
        // eslint-disable-next-line no-console
        console.log(`Database connected: ${name}`)
      })

      pool.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error(`Database pool error (${name}):`, err)
      })

      pool.on('acquire', () => {
        // Client acquired from pool
      })

      pool.on('release', () => {
        // Client released back to pool
      })
    }

    setupHandlers(this.primaryPool, 'primary')
    this.replicaPools.forEach((pool, index) => {
      setupHandlers(pool, `replica-${index}`)
    })
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Clean up metrics every 5 minutes
    setInterval(() => {
      const cutoff = Date.now() - 300000 // 5 minutes
      this.queryMetrics = this.queryMetrics.filter((m) => m.timestamp > cutoff)
    }, 300000)

    // Optimize cache every 10 minutes
    setInterval(() => {
      this.optimizeCache()
    }, 600000)
  }
}

// Factory function for creating database optimizer
export function createDatabaseOptimizer(): DatabaseOptimizer {
  const config: DatabaseConfig = {
    primary: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432'),
      database: process.env.DB_NAME ?? 'drivemaster_dev',
      user: process.env.DB_USER ?? 'drivemaster',
      password: process.env.DB_PASSWORD ?? 'dev_password_123',
    },
    readReplicas: [
      {
        host: process.env.DB_READ_REPLICA_1_HOST ?? 'localhost',
        port: parseInt(process.env.DB_READ_REPLICA_1_PORT ?? '5433'),
        database: process.env.DB_NAME ?? 'drivemaster_dev',
        user: process.env.DB_USER ?? 'drivemaster',
        password: process.env.DB_PASSWORD ?? 'dev_password_123',
        weight: 1,
      },
    ],
    pooling: {
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      acquireTimeoutMillis: 60000,
      maxUses: 7500,
    },
    optimization: {
      statementTimeout: 30000,
      queryTimeout: 30000,
      slowQueryThreshold: 1000, // 1 second
      enableQueryLogging: process.env.NODE_ENV === 'development',
      enableExplainAnalyze: process.env.NODE_ENV === 'development',
    },
  }

  return new DatabaseOptimizer(config)
}
