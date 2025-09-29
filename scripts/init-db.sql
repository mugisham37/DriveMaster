-- DriveMaster Database Initialization Script
-- This script sets up the development database with proper extensions and configurations

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'drivemaster_app') THEN
        CREATE ROLE drivemaster_app WITH LOGIN PASSWORD 'app_password_123';
    END IF;
END
$$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE drivemaster_dev TO drivemaster_app;
GRANT USAGE ON SCHEMA public TO drivemaster_app;
GRANT CREATE ON SCHEMA public TO drivemaster_app;

-- Create schemas for different services
CREATE SCHEMA IF NOT EXISTS user_service;
CREATE SCHEMA IF NOT EXISTS adaptive_service;
CREATE SCHEMA IF NOT EXISTS content_service;
CREATE SCHEMA IF NOT EXISTS analytics_service;
CREATE SCHEMA IF NOT EXISTS engagement_service;

-- Grant schema permissions
GRANT USAGE, CREATE ON SCHEMA user_service TO drivemaster_app;
GRANT USAGE, CREATE ON SCHEMA adaptive_service TO drivemaster_app;
GRANT USAGE, CREATE ON SCHEMA content_service TO drivemaster_app;
GRANT USAGE, CREATE ON SCHEMA analytics_service TO drivemaster_app;
GRANT USAGE, CREATE ON SCHEMA engagement_service TO drivemaster_app;

-- Set up partitioning for time-series data
-- This will be used by the learning_events table
CREATE OR REPLACE FUNCTION create_monthly_partition(
    table_name TEXT,
    start_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_month TEXT;
    end_month TEXT;
BEGIN
    start_month := to_char(start_date, 'YYYY_MM');
    end_month := to_char(start_date + INTERVAL '1 month', 'YYYY_MM');
    partition_name := table_name || '_' || start_month;
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I 
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, start_date + INTERVAL '1 month');
END;
$$ LANGUAGE plpgsql;

-- Performance optimization settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Enable query performance tracking
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET track_functions = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries (>1s)

SELECT pg_reload_conf();