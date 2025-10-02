import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema.js'

// Database configuration
const connectionString =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'drivemaster'}:${process.env.DB_PASSWORD ?? 'dev_password_123'}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'drivemaster_dev'}`

// Create connection with optimized settings for content service
const client = postgres(connectionString, {
  max: 20, // Maximum connections in pool
  idle_timeout: 30, // Close idle connections after 30 seconds
  connect_timeout: 10, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for better compatibility
})

// Create Drizzle instance with schema
export const db = drizzle(client, { schema })

// Export types for use in services
export type Database = typeof db
export * from './schema.js'

// Graceful shutdown handlers
const gracefulShutdown = async (signal: string): Promise<void> => {
  // Using console.log is acceptable for operational logging
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, closing database connection...`)
  try {
    await client.end()
    // Using console.log is acceptable for operational logging
    // eslint-disable-next-line no-console
    console.log('Database connection closed successfully')
  } catch (error) {
    // Using console.error is acceptable for error logging
    // eslint-disable-next-line no-console
    console.error('Error closing database connection:', error)
    throw error
  }
}

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch((error) => {
    // Using console.error is acceptable for error logging
    // eslint-disable-next-line no-console
    console.error('Error during graceful shutdown:', error)
    // In this case, we need to exit the process as it's a shutdown handler
    // eslint-disable-next-line no-process-exit
    process.exit(1)
  })
})

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch((error) => {
    // Using console.error is acceptable for error logging
    // eslint-disable-next-line no-console
    console.error('Error during graceful shutdown:', error)
    // In this case, we need to exit the process as it's a shutdown handler
    // eslint-disable-next-line no-process-exit
    process.exit(1)
  })
})
