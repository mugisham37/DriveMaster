-- Activity tracking tables for User Service
-- This script creates the necessary tables for user activity tracking and analytics

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create activity type enum
CREATE TYPE activity_type AS ENUM (
    'login', 'logout', 'attempt_start', 'attempt_submit', 'session_start', 'session_end',
    'content_view', 'hint_request', 'explanation_view', 'progress_view', 'settings_update',
    'profile_update', 'search', 'filter', 'export', 'share', 'bookmark', 'unbookmark',
    'review', 'feedback', 'error', 'performance'
);

-- User activities table (partitioned by date for scalability)
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type activity_type NOT NULL,
    session_id UUID,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    topic_id VARCHAR(100),

    -- Activity metadata
    metadata JSONB DEFAULT '{}',

    -- Context information
    device_type VARCHAR(50),
    app_version VARCHAR(50),
    platform VARCHAR(50),
    user_agent TEXT,
    ip_address INET,

    -- Timing information
    duration_ms BIGINT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_ms IS NULL OR duration_ms >= 0)
) PARTITION BY RANGE (created_at);

-- Create initial partition for user_activities table
CREATE TABLE IF NOT EXISTS user_activities_2024 PARTITION OF user_activities
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Create future partition for 2025
CREATE TABLE IF NOT EXISTS user_activities_2025 PARTITION OF user_activities
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Activity insights table
CREATE TABLE IF NOT EXISTS activity_insights (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    category VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    action_items JSONB DEFAULT '[]',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Activity recommendations table
CREATE TABLE IF NOT EXISTS activity_recommendations (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 10),
    category VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    actions JSONB DEFAULT '[]',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_priority CHECK (priority >= 1 AND priority <= 10)
);

-- Create indexes for performance
-- User activities indexes
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON user_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_item_id ON user_activities(item_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_topic_id ON user_activities(topic_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_timestamp ON user_activities(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_device_type ON user_activities(device_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_platform ON user_activities(platform);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);

-- Activity insights indexes
CREATE INDEX IF NOT EXISTS idx_activity_insights_user_id ON activity_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_insights_type ON activity_insights(type);
CREATE INDEX IF NOT EXISTS idx_activity_insights_category ON activity_insights(category);
CREATE INDEX IF NOT EXISTS idx_activity_insights_severity ON activity_insights(severity);
CREATE INDEX IF NOT EXISTS idx_activity_insights_generated_at ON activity_insights(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_insights_expires_at ON activity_insights(expires_at) WHERE expires_at IS NOT NULL;

-- Activity recommendations indexes
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_user_id ON activity_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_type ON activity_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_category ON activity_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_priority ON activity_recommendations(priority DESC);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_generated_at ON activity_recommendations(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_applied ON activity_recommendations(applied);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_expires_at ON activity_recommendations(expires_at) WHERE expires_at IS NOT NULL;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Grant permissions to application roles
GRANT SELECT, INSERT, UPDATE, DELETE ON user_activities TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_insights TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_recommendations TO app_role;

GRANT SELECT ON user_activities TO readonly_role;
GRANT SELECT ON activity_insights TO readonly_role;
GRANT SELECT ON activity_recommendations TO readonly_role;

-- Create function to automatically create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$ LANGUAGE plpgsql;

-- Create function to clean up expired insights and recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS VOID AS $
BEGIN
    -- Clean up expired insights
    DELETE FROM activity_insights 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Clean up expired recommendations
    DELETE FROM activity_recommendations 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Log cleanup
    RAISE NOTICE 'Cleaned up expired activity insights and recommendations at %', NOW();
END;
$ LANGUAGE plpgsql;

-- Create a view for activity analytics
CREATE OR REPLACE VIEW activity_analytics AS
SELECT 
    u.id as user_id,
    u.email,
    u.country_code,
    COUNT(ua.id) as total_activities,
    COUNT(DISTINCT ua.session_id) as total_sessions,
    COUNT(DISTINCT DATE(ua.timestamp)) as active_days,
    MIN(ua.timestamp) as first_activity,
    MAX(ua.timestamp) as last_activity,
    AVG(ua.duration_ms) as avg_duration_ms,
    COUNT(CASE WHEN ua.activity_type = 'attempt_submit' THEN 1 END) as total_attempts,
    COUNT(DISTINCT ua.topic_id) as topics_practiced
FROM users u
LEFT JOIN user_activities ua ON u.id = ua.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.email, u.country_code;

-- Grant access to the view
GRANT SELECT ON activity_analytics TO app_role;
GRANT SELECT ON activity_analytics TO readonly_role;

-- Log successful creation
DO $
BEGIN
    RAISE NOTICE 'Activity tracking tables created successfully at %', NOW();
    RAISE NOTICE 'Created tables: user_activities, activity_insights, activity_recommendations';
    RAISE NOTICE 'Created partitions: user_activities_2024, user_activities_2025';
    RAISE NOTICE 'Created view: activity_analytics';
    RAISE NOTICE 'Created functions: create_monthly_partition, cleanup_expired_data';
END
$;

COMMIT;