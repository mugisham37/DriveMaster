import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/adaptive_learning';
const sql = postgres(connectionString);
const db = drizzle(sql, { schema });

async function seed() {
    console.log('🌱 Seeding database...');

    try {
        // Add seed data here
        console.log('✅ Database seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

seed();