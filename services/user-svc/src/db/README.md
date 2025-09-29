# DriveMaster Database Schema

This directory contains the complete database schema and migration system for the DriveMaster platform, implementing a production-grade adaptive learning system with advanced ML capabilities.

## Overview

The database schema is designed to support:

- **Bayesian Knowledge Tracing** for personalized learning
- **Multi-Armed Bandit** algorithms for optimal question selection
- **Spaced Repetition** with SuperMemo SM-2 algorithm
- **Real-time analytics** and event processing
- **Horizontal scaling** with partitioning
- **High performance** with optimized indexes

## Schema Architecture

### Core Tables

#### Users Table

- Stores user profiles with cognitive patterns and learning preferences
- JSONB fields for flexible user data storage
- Gamification data (XP, streaks, achievements)

#### Concepts Table

- Hierarchical knowledge structure with prerequisites
- Category-based organization (traffic signs, road rules, etc.)
- Difficulty calibration and learning time estimates

#### Knowledge States Table

- **Partitioned by user_id** for horizontal scaling
- Bayesian Knowledge Tracing parameters:
  - Initial knowledge probability
  - Learning rate
  - Guess and slip parameters
  - Mastery probability
  - Temporal decay factors

#### Content Table

- Learning materials with Item Response Theory parameters
- Content versioning for A/B testing
- Performance tracking and analytics
- Multimedia metadata support

#### Learning Events Table

- **Partitioned by timestamp** for time-series data
- Real-time event processing for ML pipelines
- Response data and context information
- Session tracking and analytics

### Advanced Features

#### Partitioning Strategy

- **Knowledge States**: Hash partitioned by `user_id` (8 partitions)
- **Learning Events**: Range partitioned by `timestamp` (monthly)
- Enables horizontal scaling and improved query performance

#### Index Optimization

- **GIN indexes** for JSONB columns (cognitive patterns, metadata)
- **Composite indexes** for frequent query patterns
- **Partial indexes** for active records only
- **Covering indexes** to avoid table lookups

#### Performance Features

- Connection pooling with PgBouncer configuration
- Read replica support with intelligent routing
- Materialized views for complex analytics
- Query optimization utilities

## File Structure

```
src/db/
├── schema.ts              # Complete database schema with Drizzle ORM
├── connection.ts          # Database connections and pooling
├── migrate.ts            # Migration system with rollback support
├── utils.ts              # Performance monitoring and optimization
├── migrations/           # Generated migration files
│   ├── 0000_*.sql       # Forward migration
│   └── 0000_*.rollback.sql # Rollback migration
└── __tests__/
    └── schema.test.ts    # Comprehensive schema tests
```

## Setup Instructions

### 1. Database Prerequisites

```bash
# Install PostgreSQL 16+
# Create database and user
createdb drivemaster_dev
createuser drivemaster -P  # Set password: dev_password_123

# Grant permissions
psql -d drivemaster_dev -c "GRANT ALL PRIVILEGES ON DATABASE drivemaster_dev TO drivemaster;"
```

### 2. Environment Configuration

Create `.env` file in the service root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=drivemaster_dev
DB_USER=drivemaster
DB_PASSWORD=dev_password_123
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30
DB_CONNECT_TIMEOUT=10

# Read replica (optional)
DB_READ_REPLICA_HOST=localhost
DB_READ_REPLICA_PORT=5432
```

### 3. Run Migrations

```bash
# Generate migration files
pnpm db:generate

# Run migrations with optimizations
pnpm db:migrate up

# Check migration status
pnpm db:status

# Rollback if needed
pnpm db:rollback
```

### 4. Seed Development Data

```bash
# Populate with sample data
pnpm db:seed seed

# Reset database (clear + seed)
pnpm db:seed reset
```

## Migration Commands

### Basic Operations

```bash
pnpm db:migrate up         # Run pending migrations
pnpm db:migrate status     # Show migration status
pnpm db:migrate rollback   # Rollback last migration
```

### Performance Operations

```bash
pnpm db:migrate optimize   # Optimize database performance
pnpm db:migrate indexes    # Create optimized indexes
pnpm db:migrate partitions # Create table partitions
pnpm db:migrate maintenance # Run VACUUM ANALYZE
pnpm db:migrate monitor    # Show performance metrics
```

## Schema Features

### Bayesian Knowledge Tracing

```typescript
interface KnowledgeState {
  initialKnowledge: number // Prior knowledge probability (0-1)
  learningRate: number // How quickly user learns (0-1)
  guessParameter: number // Probability of correct guess (0-0.5)
  slipParameter: number // Probability of slip/mistake (0-0.5)
  masteryProbability: number // Current mastery estimate (0-1)
  temporalDecay: number // Forgetting factor (0.9-1.0)
  personalLearningVelocity: number // Individual learning speed
}
```

### Content Management

```typescript
interface ContentItem {
  // IRT Parameters
  difficulty: number // Item difficulty (-3 to +3)
  discrimination: number // Item discrimination (0.5-2.5)
  guessParameter: number // Guessing parameter (0-0.5)

  // Performance tracking
  totalAttempts: number
  correctAttempts: number
  averageResponseTime: number

  // A/B testing
  version: number
  parentContentId?: string // For variants
}
```

### Learning Analytics

```typescript
interface LearningEvent {
  eventType: 'question_answered' | 'session_started' | 'concept_mastered'
  responseData: {
    isCorrect: boolean
    responseTime: number
    confidenceLevel: number
    hintsUsed: number
  }
  contextData: {
    deviceType: 'mobile' | 'tablet' | 'desktop'
    timeOfDay: 'morning' | 'afternoon' | 'evening'
    networkCondition: 'excellent' | 'good' | 'poor'
  }
}
```

## Performance Optimization

### Query Patterns

The schema is optimized for these common queries:

1. **User Knowledge Lookup**

   ```sql
   SELECT * FROM knowledge_states
   WHERE user_id = ? AND mastery_probability > 0.8
   ORDER BY last_interaction DESC;
   ```

2. **Content Recommendation**

   ```sql
   SELECT * FROM content
   WHERE category = ? AND difficulty BETWEEN ? AND ?
   AND is_active = true
   ORDER BY total_attempts ASC;
   ```

3. **Learning Analytics**
   ```sql
   SELECT * FROM learning_events
   WHERE user_id = ? AND timestamp >= ?
   ORDER BY timestamp DESC;
   ```

### Index Strategy

- **Composite indexes** for multi-column queries
- **GIN indexes** for JSONB column searches
- **Partial indexes** for filtered queries
- **Covering indexes** for read-heavy operations

### Partitioning Benefits

- **Horizontal scaling**: Distribute data across partitions
- **Query performance**: Partition pruning reduces scan time
- **Maintenance**: Parallel operations on partitions
- **Archival**: Easy to drop old time-based partitions

## Testing

### Unit Tests

```bash
# Run schema tests
pnpm test src/db/__tests__/schema.test.ts

# Run with coverage
pnpm test:coverage
```

### Performance Testing

```bash
# Monitor database performance
pnpm db:monitor

# Check for missing indexes
# (Use database monitoring tools)
```

## Production Considerations

### Scaling Strategy

1. **Vertical scaling**: Increase CPU/RAM for primary database
2. **Read replicas**: Route read queries to replicas
3. **Partitioning**: Distribute data across partitions
4. **Connection pooling**: Use PgBouncer for connection management

### Backup Strategy

1. **Continuous archiving**: WAL-E or similar
2. **Point-in-time recovery**: Enable WAL archiving
3. **Logical backups**: Regular pg_dump for schema changes
4. **Cross-region replication**: For disaster recovery

### Monitoring

1. **Query performance**: pg_stat_statements
2. **Index usage**: pg_stat_user_indexes
3. **Table statistics**: pg_stat_user_tables
4. **Connection monitoring**: pg_stat_activity

## Security

### Access Control

- **Role-based permissions**: Separate read/write roles
- **Connection encryption**: SSL/TLS required
- **Password policies**: Strong password requirements
- **Network security**: VPC and firewall rules

### Data Protection

- **Encryption at rest**: Database-level encryption
- **Encryption in transit**: SSL connections
- **PII handling**: GDPR/CCPA compliance
- **Audit logging**: Track all data access

## Troubleshooting

### Common Issues

1. **Connection failures**

   ```bash
   # Check database status
   pg_isready -h localhost -p 5432

   # Verify credentials
   psql -h localhost -U drivemaster -d drivemaster_dev
   ```

2. **Migration failures**

   ```bash
   # Check migration status
   pnpm db:status

   # Rollback if needed
   pnpm db:rollback
   ```

3. **Performance issues**

   ```bash
   # Check database performance
   pnpm db:monitor

   # Run maintenance
   pnpm db:maintenance
   ```

### Performance Tuning

1. **Slow queries**: Use `EXPLAIN ANALYZE` to identify bottlenecks
2. **Missing indexes**: Check `pg_stat_user_tables` for seq_scan
3. **Table bloat**: Monitor dead tuples and run VACUUM
4. **Connection limits**: Adjust max_connections and use pooling

## Development Workflow

### Schema Changes

1. Modify `schema.ts`
2. Generate migration: `pnpm db:generate`
3. Review generated SQL
4. Create rollback SQL
5. Test migration: `pnpm db:migrate up`
6. Test rollback: `pnpm db:rollback`

### Data Seeding

1. Update `seed.ts` with new data
2. Reset database: `pnpm db:seed reset`
3. Verify data integrity
4. Update tests as needed

This database schema provides a solid foundation for the DriveMaster platform, supporting advanced ML algorithms, real-time analytics, and production-scale performance requirements.
