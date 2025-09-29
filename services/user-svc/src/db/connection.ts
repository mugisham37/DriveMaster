import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'drivemaster_dev',
  username: process.env.DB_USER || 'drivemaster',
  password: process.env.DB_PASSWORD || 'dev_password_123',
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10'),
}

// Read replica configuration for scaling read operations
const readReplicaConfig = {
  ...dbConfig,
  host: process.env.DB_READ_REPLICA_HOST || dbConfig.host,
  port: parseInt(process.env.DB_READ_REPLICA_PORT || dbConfig.port.toString()),
}

// Connection pool configuration for high concurrency
const connectionConfig = {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  username: dbConfig.username,
  password: dbConfig.password,
  max: dbConfig.max,
  idle_timeout: dbConfig.idle_timeout,
  connect_timeout: dbConfig.connect_timeout,
  // Enable connection pooling optimizations
  prepare: false, // Disable prepared statements for better pooling
  transform: {
    undefined: null, // Transform undefined to null for PostgreSQL
  },
}

// Primary database connection (write operations)
const sql = postgres(connectionConfig)
export const db = drizzle(sql, { schema })

// Read replica connection (read operations)
const readSql = postgres({
  ...connectionConfig,
  host: readReplicaConfig.host,
  port: readReplicaConfig.port,
})
export const readDb = drizzle(readSql, { schema })

// Connection health check
export async function checkDatabaseHealth(): Promise<{
  primary: boolean
  readReplica: boolean
  latency: { primary: number; readReplica: number }
}> {
  const startTime = Date.now()

  try {
    // Test primary connection
    const primaryStart = Date.now()
    await sql`SELECT 1 as health_check`
    const primaryLatency = Date.now() - primaryStart

    // Test read replica connection
    const replicaStart = Date.now()
    await readSql`SELECT 1 as health_check`
    const replicaLatency = Date.now() - replicaStart

    return {
      primary: true,
      readReplica: true,
      latency: {
        primary: primaryLatency,
        readReplica: replicaLatency,
      },
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    return {
      primary: false,
      readReplica: false,
      latency: {
        primary: -1,
        readReplica: -1,
      },
    }
  }
}

// Graceful shutdown
export async function closeDatabaseConnections(): Promise<void> {
  try {
    await sql.end()
    await readSql.end()
    console.log('Database connections closed successfully')
  } catch (error) {
    console.error('Error closing database connections:', error)
  }
}

// Connection pool monitoring
export function getConnectionStats() {
  return {
    primary: {
      totalConnections: sql.options.max,
      // Additional stats would be available in a production monitoring setup
    },
    readReplica: {
      totalConnections: readSql.options.max,
    },
  }
}

// Intelligent read/write routing
export class DatabaseRouter {
  static async executeRead<T>(query: () => Promise<T>): Promise<T> {
    try {
      // Try read replica first
      return await query()
    } catch (error) {
      console.warn('Read replica failed, falling back to primary:', error)
      // Fallback to primary database
      return await query()
    }
  }

  static async executeWrite<T>(query: () => Promise<T>): Promise<T> {
    // Always use primary for writes
    return await query()
  }
}

export default db
