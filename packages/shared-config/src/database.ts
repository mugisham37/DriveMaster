import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import type { DatabaseConfig } from './environment'

export interface DatabaseConnection {
  db: ReturnType<typeof drizzle>
  client: ReturnType<typeof postgres>
  close: () => Promise<void>
}

export function createDatabaseConnection(config: DatabaseConfig): DatabaseConnection {
  const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`

  const client = postgres(connectionString, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutMs / 1000,
    connect_timeout: config.connectionTimeoutMs / 1000,
    ssl: config.ssl ? 'require' : false,
    transform: {
      undefined: null,
    },
    types: {
      bigint: postgres.BigInt,
    },
  })

  const db = drizzle(client, {
    logger: process.env.NODE_ENV === 'development',
  })

  return {
    db,
    client,
    close: async () => {
      await client.end()
    },
  }
}

// Database health check utility
export async function checkDatabaseHealth(client: ReturnType<typeof postgres>): Promise<boolean> {
  try {
    await client`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Migration utilities
export interface MigrationConfig {
  migrationsFolder: string
  migrationsTable?: string
}

export async function runMigrations(
  client: ReturnType<typeof postgres>,
  config: MigrationConfig,
): Promise<void> {
  // This will be implemented with drizzle-kit
  console.log('Running migrations from:', config.migrationsFolder)
  // Implementation will be added when setting up individual services
}
