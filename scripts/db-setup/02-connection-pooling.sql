-- Connection pooling and performance optimization settings
-- This script configures database-level settings for optimal performance

-- Create connection pooling statistics view
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity 
WHERE datname = 'adaptive_learning';

-- Create function to monitor connection usage
CREATE OR REPLACE FUNCTION get_connection_summary()
RETURNS TABLE(
    total_connections bigint,
    active_connections bigint,
    idle_connections bigint,
    idle_in_transaction bigint,
    max_connections integer
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active_connections,
        COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
        (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') as max_connections
    FROM pg_stat_activity 
    WHERE datname = 'adaptive_learning';
END;
$$ LANGUAGE plpgsql;

-- Create function to kill idle connections
CREATE OR REPLACE FUNCTION kill_idle_connections(idle_threshold interval DEFAULT '30 minutes')
RETURNS integer AS $$
DECLARE
    killed_count integer := 0;
    conn_record record;
BEGIN
    FOR conn_record IN 
        SELECT pid, usename, state, state_change
        FROM pg_stat_activity 
        WHERE datname = 'adaptive_learning'
        AND state = 'idle'
        AND state_change < NOW() - idle_threshold
        AND usename != 'postgres'
    LOOP
        BEGIN
            PERFORM pg_terminate_backend(conn_record.pid);
            killed_count := killed_count + 1;
            RAISE NOTICE 'Killed idle connection: PID %, User %, Idle since %', 
                conn_record.pid, conn_record.usename, conn_record.state_change;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to kill connection PID %: %', conn_record.pid, SQLERRM;
        END;
    END LOOP;
    
    RETURN killed_count;
END;
$$ LANGUAGE plpgsql;

-- Create performance monitoring views
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 1000  -- queries taking more than 1 second on average
ORDER BY mean_time DESC;

-- Create table size monitoring view
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Create index usage monitoring view
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

-- Set up automatic statistics collection
-- Enable pg_stat_statements extension for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configure automatic vacuum and analyze
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;
ALTER SYSTEM SET autovacuum_vacuum_cost_delay = 10;
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 1000;

-- Configure checkpoint and WAL settings for performance
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;

-- Create maintenance procedures
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS void AS $$
BEGIN
    -- Analyze all tables to update statistics
    ANALYZE;
    
    -- Clean up old WAL files
    PERFORM pg_switch_wal();
    
    -- Update table statistics
    UPDATE pg_stat_user_tables SET last_analyze = NOW() WHERE schemaname = 'public';
    
    RAISE NOTICE 'Maintenance cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION get_connection_summary() TO app_role;
GRANT EXECUTE ON FUNCTION kill_idle_connections(interval) TO migration_role;
GRANT EXECUTE ON FUNCTION maintenance_cleanup() TO migration_role;

GRANT SELECT ON connection_stats TO app_role;
GRANT SELECT ON slow_queries TO app_role;
GRANT SELECT ON table_sizes TO readonly_role;
GRANT SELECT ON index_usage TO readonly_role;

COMMIT;