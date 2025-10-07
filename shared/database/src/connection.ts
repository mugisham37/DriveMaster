import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection configuration interface
export interface DatabaseConfig {
    connectionString: string;
    maxConnections?: number;
    idleTimeout?: number;
    connectionTimeout?: number;
    ssl?: boolean | 'require' | 'allow' | 'prefer' | 'verify-full';
}

// Default configuration
const defaultConfig: Partial<DatabaseConfig> = {
    maxConnections: 20,
    idleTimeout: 30, // seconds
    connectionTimeout: 10, // seconds
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
};

// Connection pool management
class DatabaseConnection {
    private static instances: Map<string, DatabaseConnection> = new Map();
    private client: postgres.Sql;
    private db: ReturnType<typeof drizzle>;

    private constructor(config: DatabaseConfig) {
        const finalConfig = { ...defaultConfig, ...config };

        this.client = postgres(finalConfig.connectionString, {
            max: finalConfig.maxConnections,
            idle_timeout: finalConfig.idleTimeout,
            connect_timeout: finalConfig.connectionTimeout,
            ssl: finalConfig.ssl,
            onnotice: (notice: any) => {
                console.log('PostgreSQL notice:', notice);
            },
            onparameter: (key: string, value: any) => {
                console.log('PostgreSQL parameter:', key, value);
            },
        });

        this.db = drizzle(this.client, { schema });
    }

    public static getInstance(config: DatabaseConfig): DatabaseConnection {
        const key = config.connectionString;

        if (!this.instances.has(key)) {
            this.instances.set(key, new DatabaseConnection(config));
        }

        return this.instances.get(key)!;
    }

    public getDb() {
        return this.db;
    }

    public getClient() {
        return this.client;
    }

    public async close() {
        await this.client.end();
    }

    public async healthCheck(): Promise<boolean> {
        try {
            await this.client`SELECT 1`;
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }

    public async getConnectionInfo() {
        try {
            const result = await this.client`
        SELECT 
          current_database() as database,
          current_user as user,
          version() as version,
          NOW() as current_time
      `;
            return result[0];
        } catch (error) {
            console.error('Failed to get connection info:', error);
            throw error;
        }
    }
}

// Convenience functions for common connection patterns
export function createDatabase(config: DatabaseConfig) {
    return DatabaseConnection.getInstance(config);
}

export function createDatabaseFromEnv() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required');
    }

    return createDatabase({
        connectionString,
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10'),
    });
}

// Connection for different service roles
export function createAppConnection() {
    const connectionString = process.env.DATABASE_URL ||
        'postgresql://app_user:app_secure_password_2024!@localhost:5432/adaptive_learning';

    return createDatabase({ connectionString });
}

export function createReadOnlyConnection() {
    const connectionString = process.env.READONLY_DATABASE_URL ||
        'postgresql://readonly_user:readonly_secure_password_2024!@localhost:5432/adaptive_learning';

    return createDatabase({ connectionString });
}

export function createMigrationConnection() {
    const connectionString = process.env.MIGRATION_DATABASE_URL ||
        'postgresql://migration_user:migration_secure_password_2024!@localhost:5432/adaptive_learning';

    return createDatabase({ connectionString });
}

// Export the schema for use in services
export { schema };
export type Database = ReturnType<typeof drizzle>;

// Utility function to run queries with error handling
export async function withDatabase<T>(
    operation: (db: Database) => Promise<T>,
    connectionConfig?: DatabaseConfig
): Promise<T> {
    const dbConnection = connectionConfig
        ? createDatabase(connectionConfig)
        : createDatabaseFromEnv();

    try {
        const db = dbConnection.getDb();
        return await operation(db);
    } catch (error) {
        console.error('Database operation failed:', error);
        throw error;
    }
}

// Transaction helper
export async function withTransaction<T>(
    operation: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
    connectionConfig?: DatabaseConfig
): Promise<T> {
    return withDatabase(async (db) => {
        return await db.transaction(operation);
    }, connectionConfig);
}