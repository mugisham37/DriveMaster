-- Create database users with proper permissions
-- This script sets up role-based access control for the adaptive learning platform

-- Create roles for different access patterns
CREATE ROLE app_role;
CREATE ROLE readonly_role;
CREATE ROLE migration_role;

-- Create specific users
CREATE USER app_user WITH PASSWORD 'app_secure_password_2024!';
CREATE USER readonly_user WITH PASSWORD 'readonly_secure_password_2024!';
CREATE USER migration_user WITH PASSWORD 'migration_secure_password_2024!';
CREATE USER replicator WITH REPLICATION PASSWORD 'replication_secure_password_2024!';

-- Assign roles to users
GRANT app_role TO app_user;
GRANT readonly_role TO readonly_user;
GRANT migration_role TO migration_user;

-- Grant database connection permissions
GRANT CONNECT ON DATABASE adaptive_learning TO app_role;
GRANT CONNECT ON DATABASE adaptive_learning TO readonly_role;
GRANT CONNECT ON DATABASE adaptive_learning TO migration_role;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO app_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT USAGE ON SCHEMA public TO migration_role;

-- App role permissions (read/write for application operations)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_role;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO app_role;

-- Readonly role permissions (analytics, reporting)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO readonly_role;

-- Set default permissions for future tables (readonly)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO readonly_role;

-- Migration role permissions (schema changes)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migration_role;
GRANT ALL PRIVILEGES ON SCHEMA public TO migration_role;
GRANT CREATE ON DATABASE adaptive_learning TO migration_role;

-- Set default permissions for future objects (migration)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO migration_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO migration_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO migration_role;

-- Create connection pooling configuration
-- Note: This would typically be handled by PgBouncer or similar
COMMENT ON ROLE app_role IS 'Application role for normal CRUD operations';
COMMENT ON ROLE readonly_role IS 'Read-only role for analytics and reporting';
COMMENT ON ROLE migration_role IS 'Migration role for schema changes';

-- Security settings
ALTER ROLE app_user SET statement_timeout = '30s';
ALTER ROLE app_user SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE readonly_user SET statement_timeout = '300s';
ALTER ROLE readonly_user SET default_transaction_isolation = 'read committed';

-- Logging and monitoring
ALTER ROLE app_user SET log_statement = 'mod';
ALTER ROLE migration_user SET log_statement = 'all';

COMMIT;