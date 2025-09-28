# PostgreSQL Design

- user-svc: users, sessions, profiles (JSONB)
- adaptive-svc: user_knowledge_state (range partitioned by user_id hash), learning_events (partitioned by time)
- content-svc: items, concepts, mappings; search mirrored to Elasticsearch

Indexes
- Composite indexes on frequent filters (user_id + concept_id, timestamp ranges)
- JSONB GIN indexes where needed

Operations
- PgBouncer for pooling; read replicas for read-heavy endpoints
- Materialized views for analytics; refresh via background jobs