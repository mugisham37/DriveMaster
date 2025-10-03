# Database Migration Guide

This guide covers the database migration system for the Adaptive Learning Platform.

## Overview

The migration system provides:

- **Version Control**: Track database schema changes over time
- **Rollback Support**: Ability to undo migrations if needed
- **Validation**: Ensure schema integrity after migrations
- **Automation**: CLI tools for easy migration management

## Migration Files

Migration files are stored in the `migrations/` directory and follow this naming convention:

```
NNNN_description.sql
```

Where:

- `NNNN` is a 4-digit sequence number (0001, 0002, etc.)
- `description` is a brief description of the migration

### Current Migrations

1. **0001_initial_schema.sql** - Creates all core tables and types
2. **0002_create_indexes.sql** - Creates performance indexes
3. **0003_create_triggers.sql** - Creates triggers for data integrity
4. **0004_create_views.sql** - Creates monitoring and analytics views

## Running Migrations

### Prerequisites

1. Ensure PostgreSQL is running
2. Set environment variables:
   ```bash
   export DATABASE_URL="postgresql://migration_user:migration_secure_password_2024!@localhost:5432/adaptive_learning"
   ```

### Basic Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Test database connection
npm run test-connection

# Run all pending migrations
npm run migrate

# Check migration status
npx tsx src/cli.ts migration status

# Validate schema after migration
npm run validate-schema
```

### Complete Test Suite

Run the complete migration test suite:

```bash
npm run test-migrations
```

This will:

1. Build the TypeScript code
2. Test database connectivity
3. Run all migrations
4. Validate schema integrity
5. Seed test data
6. Test basic queries

## Creating New Migrations

### 1. Generate Migration File

```bash
npx tsx src/cli.ts migration generate "add_user_preferences_table"
```

This creates a new migration file with a template.

### 2. Edit Migration File

```sql
-- Migration: Add User Preferences Table
-- Created: 2024-01-01T12:00:00.000Z
-- Description: Add table for storing user preferences

-- Forward migration
BEGIN;

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);

COMMIT;

-- Rollback migration (optional)
-- BEGIN;
-- DROP TABLE IF EXISTS user_preferences;
-- COMMIT;
```

### 3. Run Migration

```bash
npm run migrate
```

### 4. Validate

```bash
npm run validate-schema
```

## Migration Best Practices

### 1. Always Use Transactions

Wrap migration SQL in `BEGIN;` and `COMMIT;` blocks:

```sql
BEGIN;
-- Your migration SQL here
COMMIT;
```

### 2. Include Rollback SQL

Add rollback instructions as comments:

```sql
-- Rollback migration (optional)
-- BEGIN;
-- DROP TABLE IF EXISTS new_table;
-- COMMIT;
```

### 3. Test Migrations Thoroughly

- Test on a copy of production data
- Verify performance impact
- Test rollback procedures
- Validate data integrity

### 4. Use Descriptive Names

Migration names should clearly describe the change:

- ✅ `add_user_notification_preferences`
- ✅ `modify_items_table_add_difficulty_index`
- ❌ `update_schema`
- ❌ `fix_bug`

### 5. Handle Large Tables Carefully

For large tables, consider:

- Adding indexes concurrently: `CREATE INDEX CONCURRENTLY`
- Using batched updates
- Planning for downtime if necessary

### 6. Validate Constraints

Always validate that constraints work as expected:

```sql
-- Test constraint
INSERT INTO users (email, country_code) VALUES ('invalid-email', 'US');
-- Should fail due to email validation constraint
```

## Rollback Procedures

### Automatic Rollback

```bash
npx tsx src/cli.ts migration rollback
```

This rolls back the last applied migration if rollback SQL is available.

### Manual Rollback

1. Identify the migration to rollback:

   ```bash
   npx tsx src/cli.ts migration status
   ```

2. Execute rollback SQL manually:

   ```sql
   -- Copy rollback SQL from migration file
   BEGIN;
   DROP TABLE IF EXISTS new_table;
   COMMIT;
   ```

3. Update migration history:
   ```sql
   UPDATE migration_history
   SET success = false, error_message = 'Manually rolled back'
   WHERE migration_name = 'problematic_migration';
   ```

## Troubleshooting

### Migration Fails

1. **Check error message**:

   ```bash
   npx tsx src/cli.ts migration status
   ```

2. **Validate current schema**:

   ```bash
   npm run validate-schema
   ```

3. **Check database logs**:
   ```sql
   SELECT * FROM migration_history ORDER BY applied_at DESC LIMIT 5;
   ```

### Schema Validation Fails

1. **Run detailed validation**:

   ```bash
   npm run validate-migrations
   ```

2. **Check missing objects**:

   ```sql
   -- Check tables
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';

   -- Check indexes
   SELECT indexname FROM pg_indexes
   WHERE schemaname = 'public';
   ```

### Connection Issues

1. **Test connection**:

   ```bash
   npm run test-connection
   ```

2. **Check environment variables**:

   ```bash
   echo $DATABASE_URL
   ```

3. **Verify database is running**:
   ```bash
   pg_isready -h localhost -p 5432
   ```

## Production Deployment

### Pre-deployment Checklist

- [ ] Test migrations on staging environment
- [ ] Backup production database
- [ ] Plan for rollback if needed
- [ ] Coordinate with team for downtime (if required)
- [ ] Monitor system during migration

### Deployment Steps

1. **Backup database**:

   ```bash
   pg_dump -h localhost -U postgres adaptive_learning > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run migrations**:

   ```bash
   npm run migrate
   ```

3. **Validate schema**:

   ```bash
   npm run validate-schema
   ```

4. **Monitor application**:
   - Check application logs
   - Monitor performance metrics
   - Verify functionality

### Post-deployment

- [ ] Verify all services are running
- [ ] Check application functionality
- [ ] Monitor performance
- [ ] Update documentation if needed

## Monitoring and Maintenance

### Regular Checks

```sql
-- Check migration history
SELECT * FROM migration_history ORDER BY applied_at DESC;

-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check table sizes
SELECT * FROM table_sizes LIMIT 10;

-- Check slow queries
SELECT * FROM slow_queries LIMIT 5;
```

### Performance Monitoring

```sql
-- Check index usage
SELECT * FROM index_usage WHERE idx_tup_read < 1000;

-- Check connection stats
SELECT * FROM connection_stats;

-- Check system health
SELECT * FROM system_health;
```

## Advanced Topics

### Partitioning

The `attempts` table is partitioned by date. To add new partitions:

```sql
-- Add partition for 2025
CREATE TABLE attempts_2025 PARTITION OF attempts
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### Data Migration

For large data migrations, use batched updates:

```sql
-- Update in batches of 1000
DO $$
DECLARE
    batch_size INTEGER := 1000;
    total_updated INTEGER := 0;
    batch_updated INTEGER;
BEGIN
    LOOP
        UPDATE items
        SET difficulty = difficulty * 1.1
        WHERE id IN (
            SELECT id FROM items
            WHERE difficulty < 2.0
            LIMIT batch_size
        );

        GET DIAGNOSTICS batch_updated = ROW_COUNT;
        total_updated := total_updated + batch_updated;

        RAISE NOTICE 'Updated % rows (total: %)', batch_updated, total_updated;

        EXIT WHEN batch_updated = 0;

        -- Small delay to avoid overwhelming the database
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

### Schema Evolution

When modifying existing tables:

1. **Add new columns** (safe):

   ```sql
   ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
   ```

2. **Remove columns** (requires care):

   ```sql
   -- First, ensure no code references the column
   ALTER TABLE users DROP COLUMN old_column;
   ```

3. **Modify column types** (potentially breaking):

   ```sql
   -- Safe: expanding varchar
   ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(500);

   -- Risky: changing data type
   ALTER TABLE users ALTER COLUMN age TYPE INTEGER USING age::INTEGER;
   ```

## Support

For issues with migrations:

1. Check this guide first
2. Review migration logs
3. Test on development environment
4. Consult with database team
5. Create detailed issue report with:
   - Migration file content
   - Error messages
   - Database version
   - Environment details
