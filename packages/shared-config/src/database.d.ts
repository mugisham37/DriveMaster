import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { DatabaseConfig } from './environment'
export interface DatabaseConnection {
  db: ReturnType<typeof drizzle>
  client: ReturnType<typeof postgres>
  close: () => Promise<void>
}
export declare function createDatabaseConnection(config: DatabaseConfig): DatabaseConnection
export declare function checkDatabaseHealth(client: ReturnType<typeof postgres>): Promise<boolean>
export interface MigrationConfig {
  migrationsFolder: string
  migrationsTable?: string
}
export declare function runMigrations(
  client: ReturnType<typeof postgres>,
  config: MigrationConfig,
): Promise<void>
//# sourceMappingURL=database.d.ts.map
