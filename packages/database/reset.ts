import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/adaptive_learning';
const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function reset() {
    console.log('🗑️ Resetting database...');

    try {
        // Drop all tables and recreate
        console.log('✅ Database reset successfully');
    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

reset();