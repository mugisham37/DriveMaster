import type { Config } from 'drizzle-kit';

export default {
    schema: './src/schema/index.ts',
    out: './migrations',
    driver: 'pg',
    dbCredentials: {
        connectionString: process.env.DATABASE_URL || 'postgresql://app_user:app_secure_password_2024!@localhost:5432/adaptive_learning',
    },
    verbose: true,
    strict: true,
} satisfies Config;