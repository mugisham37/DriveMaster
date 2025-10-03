# Adaptive Learning Platform - Database Package

This package provides the shared database schema, migrations, and utilities for the Adaptive Learning Platform.

## Features

- **Drizzle ORM Schema**: Type-safe database schema definitions
- **Migration System**: Version-controlled database migrations with rollback support
- **Connection Management**: Connection pooling and role-based access
- **Seeding**: Development and testing data seeding
- **CLI Tools**: Command-line interface for database management

## Installation

```bash
npm install
npm run build
```

## Environment Variables

```bash
# Primary database connection (for migrations and admin operations)
DATABASE_URL=postgresql://migration_user:migration_secure_password_2024!@localhost:5432/adaptive_learning

# Application database connection
APP_DATABASE_URL=postgresql://app_user:app_secure_password_2024!@localhost:5432/adaptive_learning

# Read-only database connection (for analytics and reporting)
READONLY_DATABASE_URL=postgresql://readonly_user:readonly_secure_password_2024!@localhost:5432/adaptive_learning
```

## CLI Usage

The package includes a comprehensive CLI for database management:

### Migration Commands

```bash
# Run pending migrations
npm run migrate
# or
npx db-cli migration run

# Check migration status
npx db-cli migration status

# Generate new migration
npx db-cli migration generate "add_user_preferences"

# Rollback last migration
npx db-cli migration rollback
```

### Schema Commands

```bash
# Validate database schema
npm run validate-schema
# or
npx db-cli schema validate
```

### Seeding Commands

```bash
# Run database seeding
npm run seed
# or
npx db-cli seed run

# Clear seed data
npx db-cli seed clear --confirm
```

### Connection Commands

```bash
# Test database connection
npm run test-connection
# or
npx db-cli connection test

# Show database information
npx db-cli connection info
```

### Utility Commands

```bash
# Reset entire database (destructive!)
npx db-cli reset --confirm
```

## Usage in Services

### Basic Connection

```typescript
import { createAppConnection, schema } from "@adaptive-learning/database";

const connection = createAppConnection();
const db = connection.getDb();

// Query users
const users = await db.select().from(schema.users).limit(10);
```

### With Transactions

```typescript
import { withTransaction, schema } from "@adaptive-learning/database";

const result = await withTransaction(async (tx) => {
  const user = await tx
    .insert(schema.users)
    .values({
      email: "user@example.com",
      countryCode: "US",
    })
    .returning();

  await tx.insert(schema.userSchedulerState).values({
    userId: user[0].id,
    abilityVector: {},
    sm2States: {},
    bktStates: {},
  });

  return user[0];
});
```

### Role-Based Connections

```typescript
import {
  createAppConnection, // Full read/write access
  createReadOnlyConnection, // Read-only access for analytics
  createMigrationConnection, // Admin access for migrations
} from "@adaptive-learning/database";

// Use appropriate connection based on operation
const analyticsDb = createReadOnlyConnection().getDb();
const appDb = createAppConnection().getDb();
```

## Schema Overview

### Core Tables

- **users**: User accounts with authentication and profile data
- **oauth_providers**: OAuth provider integrations
- **refresh_tokens**: JWT refresh token management
- **items**: Learning content items with IRT parameters
- **attempts**: User attempt records (partitioned by date)
- **sessions**: Learning session tracking
- **skill_mastery**: Per-topic mastery tracking
- **user_scheduler_state**: Adaptive algorithm state

### Analytics Tables

- **user_activity**: User activity tracking
- **item_analytics**: Content performance metrics
- **topic_analytics**: Topic-level analytics
- **user_engagement**: User engagement metrics
- **system_metrics**: System performance metrics
- **ab_test_results**: A/B testing results

## Database Configuration

The database is configured with:

- **Connection Pooling**: Optimized for high concurrency
- **Performance Settings**: Tuned for OLTP workloads
- **Security**: Role-based access control with encrypted connections
- **Backup**: Automated backup procedures with point-in-time recovery
- **Monitoring**: Built-in performance monitoring and alerting

## Development Workflow

1. **Make Schema Changes**: Update schema files in `src/schema/`
2. **Generate Migration**: `npx db-cli migration generate "description"`
3. **Review Migration**: Edit the generated SQL file if needed
4. **Run Migration**: `npm run migrate`
5. **Validate Schema**: `npm run validate-schema`
6. **Update Seed Data**: Modify `src/seed.ts` if needed
7. **Test Changes**: `npm run seed` to populate test data

## Production Deployment

1. **Environment Setup**: Configure production database URLs
2. **Run Migrations**: `npm run migrate` in production environment
3. **Validate Schema**: `npm run validate-schema` to ensure consistency
4. **Monitor Performance**: Use built-in monitoring views and functions

## Troubleshooting

### Connection Issues

```bash
# Test connection
npx db-cli connection test

# Check database info
npx db-cli connection info
```

### Migration Issues

```bash
# Check migration status
npx db-cli migration status

# Rollback if needed
npx db-cli migration rollback
```

### Performance Issues

```sql
-- Check slow queries
SELECT * FROM slow_queries;

-- Check table sizes
SELECT * FROM table_sizes;

-- Check index usage
SELECT * FROM index_usage;
```

## Contributing

1. Follow the existing schema patterns
2. Add appropriate indexes for new queries
3. Include proper TypeScript types
4. Update seed data for new tables
5. Test migrations thoroughly before committing
