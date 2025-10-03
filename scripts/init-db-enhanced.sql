-- Enhanced Database Initialization Script for Adaptive Learning Platform
-- This script sets up the complete database infrastructure with proper configuration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search optimization

-- Set session parameters for initialization
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

-- Create custom types
CREATE TYPE item_status AS ENUM ('draft', 'under_review', 'approved', 'published', 'archived');
CREATE TYPE session_type AS ENUM ('practice', 'review', 'mock_test', 'placement');
CREATE TYPE user_role AS ENUM ('learner', 'content_author', 'content_reviewer', 'admin');

-- Create roles for different access patterns
DO $$
BEGIN
    -- Create roles if they don't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_role') THEN
        CREATE ROLE app_role;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'readonly_role') THEN
        CREATE ROLE readonly_role;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'migration_role') THEN
        CREATE ROLE migration_role;
    END IF;
END
$$;

-- Create users with secure passwords (these should be changed in production)
DO $$
BEGIN
    -- Create users if they don't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'app_user') THEN
        CREATE USER app_user WITH PASSWORD 'app_secure_password_2024!';
        GRANT app_role TO app_user;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'readonly_user') THEN
        CREATE USER readonly_user WITH PASSWORD 'readonly_secure_password_2024!';
        GRANT readonly_role TO readonly_user;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'migration_user') THEN
        CREATE USER migration_user WITH PASSWORD 'migration_secure_password_2024!';
        GRANT migration_role TO migration_user;
    END IF;
END
$$;

-- Grant database connection permissions
GRANT CONNECT ON DATABASE adaptive_learning TO app_role;
GRANT CONNECT ON DATABASE adaptive_learning TO readonly_role;
GRANT CONNECT ON DATABASE adaptive_learning TO migration_role;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO app_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT USAGE ON SCHEMA public TO migration_role;

-- Users table with comprehensive security and audit fields
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    hashed_password VARCHAR(255), -- NULL for OAuth-only users
    country_code VARCHAR(2) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(5) DEFAULT 'en',
    preferences JSONB DEFAULT '{}',
    user_role user_role DEFAULT 'learner',
    
    -- Security fields
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Privacy and compliance
    gdpr_consent BOOLEAN DEFAULT FALSE,
    gdpr_consent_date TIMESTAMPTZ,
    data_retention_until TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_country_code CHECK (length(country_code) = 2),
    CONSTRAINT valid_language CHECK (language ~* '^[a-z]{2}(-[A-Z]{2})?$')
);

-- OAuth providers table
CREATE TABLE IF NOT EXISTS oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token_hash VARCHAR(255),
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Content items table with comprehensive metadata
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    
    -- Content structure
    content JSONB NOT NULL,
    choices JSONB NOT NULL,
    correct JSONB NOT NULL,
    explanation JSONB,
    
    -- ML parameters for IRT
    difficulty FLOAT NOT NULL DEFAULT 0.0,
    discrimination FLOAT DEFAULT 1.0,
    guessing FLOAT DEFAULT 0.25,
    
    -- Classification and metadata
    topics JSONB NOT NULL DEFAULT '[]',
    jurisdictions JSONB NOT NULL DEFAULT '[]',
    item_type VARCHAR(50) DEFAULT 'multiple_choice',
    cognitive_level VARCHAR(50) DEFAULT 'knowledge',
    
    -- Media and resources
    media_refs JSONB DEFAULT '[]',
    external_refs JSONB DEFAULT '[]',
    
    -- Metadata
    estimated_time INTEGER DEFAULT 60, -- seconds
    points INTEGER DEFAULT 1,
    tags JSONB DEFAULT '[]',
    
    -- Workflow and versioning
    version INTEGER DEFAULT 1,
    status item_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    
    -- Analytics
    usage_count INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT valid_difficulty CHECK (difficulty BETWEEN -4.0 AND 4.0),
    CONSTRAINT valid_discrimination CHECK (discrimination > 0),
    CONSTRAINT valid_guessing CHECK (guessing BETWEEN 0 AND 1),
    CONSTRAINT valid_estimated_time CHECK (estimated_time > 0),
    CONSTRAINT valid_points CHECK (points > 0)
);

-- Attempts table (partitioned by date for scalability)
CREATE TABLE IF NOT EXISTS attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    
    -- Response data
    selected JSONB NOT NULL,
    correct BOOLEAN NOT NULL,
    quality INTEGER CHECK (quality >= 0 AND quality <= 5), -- SM-2 quality
    confidence INTEGER CHECK (confidence >= 1 AND confidence <= 5),
    time_taken_ms INTEGER NOT NULL CHECK (time_taken_ms > 0),
    hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
    
    -- Context
    client_attempt_id UUID UNIQUE NOT NULL, -- for idempotency
    device_type VARCHAR(20),
    app_version VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    
    -- Algorithm state snapshots for ML training
    sm2_state_before JSONB,
    sm2_state_after JSONB,
    bkt_state_before JSONB,
    bkt_state_after JSONB,
    irt_ability_before JSONB,
    irt_ability_after JSONB,
    
    -- Audit
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create initial partition for attempts table
CREATE TABLE IF NOT EXISTS attempts_2024 PARTITION OF attempts
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Skill mastery tracking
CREATE TABLE IF NOT EXISTS skill_mastery (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(100) NOT NULL,
    mastery FLOAT NOT NULL CHECK (mastery >= 0 AND mastery <= 1),
    confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    last_practiced TIMESTAMPTZ NOT NULL,
    practice_count INTEGER DEFAULT 0 CHECK (practice_count >= 0),
    correct_streak INTEGER DEFAULT 0 CHECK (correct_streak >= 0),
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),
    total_time_ms BIGINT DEFAULT 0 CHECK (total_time_ms >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, topic)
);

-- User scheduler state for adaptive algorithms
CREATE TABLE IF NOT EXISTS user_scheduler_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- IRT ability parameters per topic
    ability_vector JSONB NOT NULL DEFAULT '{}',
    ability_confidence JSONB DEFAULT '{}',
    
    -- SM-2 state per item
    sm2_states JSONB NOT NULL DEFAULT '{}',
    
    -- BKT state per topic
    bkt_states JSONB NOT NULL DEFAULT '{}',
    
    -- Contextual bandit state
    bandit_state JSONB DEFAULT '{}',
    
    -- Session context
    current_session_id UUID,
    last_session_end TIMESTAMPTZ,
    consecutive_days INTEGER DEFAULT 0 CHECK (consecutive_days >= 0),
    total_study_time_ms BIGINT DEFAULT 0 CHECK (total_study_time_ms >= 0),
    
    -- Versioning for optimistic locking
    version INTEGER DEFAULT 1 CHECK (version > 0),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comprehensive indexes for performance
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- OAuth providers indexes
CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON oauth_providers(provider);

-- Refresh tokens indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;

-- Items table indexes
CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_jurisdictions ON items USING GIN(jurisdictions);
CREATE INDEX IF NOT EXISTS idx_items_topics ON items USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_items_difficulty ON items(difficulty);
CREATE INDEX IF NOT EXISTS idx_items_published ON items(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_items_created_by ON items(created_by);
CREATE INDEX IF NOT EXISTS idx_items_content_search ON items USING GIN(to_tsvector('english', content->>'text'));

-- Attempts table indexes
CREATE INDEX IF NOT EXISTS idx_attempts_user_time ON attempts(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_item ON attempts(item_id);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_client_id ON attempts(client_attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempts_correct ON attempts(correct);
CREATE INDEX IF NOT EXISTS idx_attempts_timestamp ON attempts(timestamp);

-- Skill mastery indexes
CREATE INDEX IF NOT EXISTS idx_mastery_user ON skill_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_topic ON skill_mastery(topic);
CREATE INDEX IF NOT EXISTS idx_mastery_last_practiced ON skill_mastery(last_practiced);
CREATE INDEX IF NOT EXISTS idx_mastery_mastery_level ON skill_mastery(mastery);

-- Scheduler state indexes
CREATE INDEX IF NOT EXISTS idx_scheduler_state_updated ON user_scheduler_state(last_updated);
CREATE INDEX IF NOT EXISTS idx_scheduler_state_session ON user_scheduler_state(last_session_end);

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_providers_updated_at BEFORE UPDATE ON oauth_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_mastery_updated_at BEFORE UPDATE ON skill_mastery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduler_state_updated_at BEFORE UPDATE ON user_scheduler_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set up permissions for application roles
-- App role permissions (read/write for application operations)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_role;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO app_role;

-- Readonly role permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO readonly_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO readonly_role;

-- Migration role permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO migration_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO migration_role;
GRANT ALL PRIVILEGES ON SCHEMA public TO migration_role;
GRANT CREATE ON DATABASE adaptive_learning TO migration_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO migration_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO migration_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO migration_role;

-- Insert sample data for development
INSERT INTO users (email, country_code, email_verified, user_role) VALUES 
('admin@example.com', 'US', true, 'admin'),
('author@example.com', 'US', true, 'content_author'),
('reviewer@example.com', 'CA', true, 'content_reviewer'),
('learner@example.com', 'CA', true, 'learner')
ON CONFLICT (email) DO NOTHING;

-- Insert sample content items
INSERT INTO items (slug, content, choices, correct, topics, jurisdictions, status, created_by) VALUES 
(
    'sample-traffic-sign-stop',
    '{"text": "What does this traffic sign mean?", "image": "stop-sign.jpg"}',
    '["Stop completely", "Yield to traffic", "Slow down", "No entry"]',
    '["Stop completely"]',
    '["traffic_signs", "road_rules"]',
    '["US", "CA"]',
    'published',
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
),
(
    'sample-right-of-way-intersection',
    '{"text": "At a four-way stop, who has the right of way?"}',
    '["First to arrive", "Vehicle on the right", "Largest vehicle", "Fastest vehicle"]',
    '["First to arrive"]',
    '["right_of_way", "intersections"]',
    '["US", "CA"]',
    'published',
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
),
(
    'sample-speed-limit-residential',
    '{"text": "What is the typical speed limit in a residential area?"}',
    '["25 mph", "35 mph", "45 mph", "55 mph"]',
    '["25 mph"]',
    '["speed_limits", "residential_driving"]',
    '["US"]',
    'published',
    (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1)
)
ON CONFLICT (slug) DO NOTHING;

-- Create monitoring and maintenance views
CREATE OR REPLACE VIEW system_health AS
SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size('adaptive_learning')) as value,
    NOW() as checked_at
UNION ALL
SELECT 
    'Active Connections' as metric,
    COUNT(*)::TEXT as value,
    NOW() as checked_at
FROM pg_stat_activity 
WHERE datname = 'adaptive_learning' AND state = 'active'
UNION ALL
SELECT 
    'Total Users' as metric,
    COUNT(*)::TEXT as value,
    NOW() as checked_at
FROM users WHERE is_active = TRUE
UNION ALL
SELECT 
    'Published Items' as metric,
    COUNT(*)::TEXT as value,
    NOW() as checked_at
FROM items WHERE status = 'published' AND is_active = TRUE;

-- Grant access to monitoring views
GRANT SELECT ON system_health TO readonly_role;
GRANT SELECT ON system_health TO app_role;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully at %', NOW();
    RAISE NOTICE 'Created tables: users, oauth_providers, refresh_tokens, items, attempts, skill_mastery, user_scheduler_state';
    RAISE NOTICE 'Created roles: app_role, readonly_role, migration_role';
    RAISE NOTICE 'Created users: app_user, readonly_user, migration_user';
    RAISE NOTICE 'Sample data inserted for development environment';
END
$$;

COMMIT;