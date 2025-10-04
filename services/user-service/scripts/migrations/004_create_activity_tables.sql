-- Migration: Create activity tracking tables
-- Description: Creates tables for user activity tracking, insights, and recommendations

-- Create user_activities table for tracking all user activities
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    session_id UUID,
    item_id UUID,
    topic_id VARCHAR(100),
    
    -- Activity metadata
    metadata JSONB DEFAULT '{}',
    
    -- Context information
    device_type VARCHAR(50),
    app_version VARCHAR(20),
    platform VARCHAR(20),
    user_agent TEXT,
    ip_address INET,
    
    -- Timing information
    duration_ms BIGINT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for user_activities table
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_timestamp ON user_activities(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_session_id ON user_activities(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_activities_item_id ON user_activities(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_activities_topic_id ON user_activities(topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp ON user_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_device_type ON user_activities(device_type) WHERE device_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_activities_platform ON user_activities(platform) WHERE platform IS NOT NULL;

-- Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_activities_metadata ON user_activities USING GIN(metadata);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_activities_user_type_timestamp ON user_activities(user_id, activity_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_session_timestamp ON user_activities(user_id, session_id, timestamp DESC) WHERE session_id IS NOT NULL;

-- Create activity_insights table for storing generated insights
CREATE TABLE IF NOT EXISTS activity_insights (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
    category VARCHAR(50) NOT NULL, -- 'engagement', 'performance', 'behavior'
    metadata JSONB DEFAULT '{}',
    action_items JSONB DEFAULT '[]',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Create indexes for activity_insights table
CREATE INDEX IF NOT EXISTS idx_activity_insights_user_id ON activity_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_insights_user_generated ON activity_insights(user_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_insights_type ON activity_insights(type);
CREATE INDEX IF NOT EXISTS idx_activity_insights_category ON activity_insights(category);
CREATE INDEX IF NOT EXISTS idx_activity_insights_severity ON activity_insights(severity);
CREATE INDEX IF NOT EXISTS idx_activity_insights_expires_at ON activity_insights(expires_at) WHERE expires_at IS NOT NULL;

-- Create GIN index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_activity_insights_metadata ON activity_insights USING GIN(metadata);

-- Create activity_recommendations table for storing personalized recommendations
CREATE TABLE IF NOT EXISTS activity_recommendations (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5, -- 1-10, higher is more important
    category VARCHAR(50) NOT NULL, -- 'study_schedule', 'content', 'strategy'
    metadata JSONB DEFAULT '{}',
    actions JSONB DEFAULT '[]',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    applied_at TIMESTAMPTZ
);

-- Create indexes for activity_recommendations table
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_user_id ON activity_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_user_priority ON activity_recommendations(user_id, priority DESC, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_type ON activity_recommendations(type);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_category ON activity_recommendations(category);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_priority ON activity_recommendations(priority DESC);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_applied ON activity_recommendations(applied);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_expires_at ON activity_recommendations(expires_at) WHERE expires_at IS NOT NULL;

-- Create GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_metadata ON activity_recommendations USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_actions ON activity_recommendations USING GIN(actions);

-- Create activity_aggregations table for pre-computed aggregations (optional optimization)
CREATE TABLE IF NOT EXISTS activity_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    aggregation_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    activity_counts JSONB NOT NULL DEFAULT '{}',
    total_activities INTEGER NOT NULL DEFAULT 0,
    total_duration_ms BIGINT NOT NULL DEFAULT 0,
    unique_sessions INTEGER NOT NULL DEFAULT 0,
    device_breakdown JSONB DEFAULT '{}',
    platform_breakdown JSONB DEFAULT '{}',
    hourly_distribution JSONB DEFAULT '{}',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, aggregation_type, period_start)
);

-- Create indexes for activity_aggregations table
CREATE INDEX IF NOT EXISTS idx_activity_aggregations_user_id ON activity_aggregations(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_aggregations_user_type_period ON activity_aggregations(user_id, aggregation_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_activity_aggregations_period_start ON activity_aggregations(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_activity_aggregations_computed_at ON activity_aggregations(computed_at DESC);

-- Create GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_activity_aggregations_activity_counts ON activity_aggregations USING GIN(activity_counts);
CREATE INDEX IF NOT EXISTS idx_activity_aggregations_device_breakdown ON activity_aggregations USING GIN(device_breakdown);

-- Add constraints and triggers

-- Add check constraints for activity_insights
ALTER TABLE activity_insights 
ADD CONSTRAINT chk_activity_insights_severity 
CHECK (severity IN ('info', 'warning', 'critical'));

ALTER TABLE activity_insights 
ADD CONSTRAINT chk_activity_insights_category 
CHECK (category IN ('engagement', 'performance', 'behavior', 'content', 'schedule'));

-- Add check constraints for activity_recommendations
ALTER TABLE activity_recommendations 
ADD CONSTRAINT chk_activity_recommendations_priority 
CHECK (priority >= 1 AND priority <= 10);

ALTER TABLE activity_recommendations 
ADD CONSTRAINT chk_activity_recommendations_category 
CHECK (category IN ('study_schedule', 'content', 'strategy', 'engagement', 'performance'));

-- Add check constraint for activity types (extend as needed)
ALTER TABLE user_activities 
ADD CONSTRAINT chk_user_activities_activity_type 
CHECK (activity_type IN (
    'login', 'logout', 'attempt_start', 'attempt_submit', 'session_start', 'session_end',
    'content_view', 'hint_request', 'explanation_view', 'progress_view', 'settings_update',
    'profile_update', 'search', 'filter', 'export', 'share', 'bookmark', 'unbookmark',
    'review', 'feedback', 'error', 'performance'
));

-- Create function to automatically clean up expired insights and recommendations
CREATE OR REPLACE FUNCTION cleanup_expired_activity_data()
RETURNS void AS $$
BEGIN
    -- Delete expired insights
    DELETE FROM activity_insights 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Delete expired recommendations
    DELETE FROM activity_recommendations 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    -- Delete old activity aggregations (keep last 2 years)
    DELETE FROM activity_aggregations 
    WHERE computed_at < NOW() - INTERVAL '2 years';
    
    -- Optionally, delete very old activity records (keep last 1 year for detailed activities)
    -- Uncomment if you want to automatically clean up old activities
    -- DELETE FROM user_activities 
    -- WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create function to update activity aggregations
CREATE OR REPLACE FUNCTION update_activity_aggregations()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    start_date DATE;
    end_date DATE;
BEGIN
    -- Get all users who have activities in the last 7 days
    FOR user_record IN 
        SELECT DISTINCT user_id 
        FROM user_activities 
        WHERE created_at >= NOW() - INTERVAL '7 days'
    LOOP
        -- Update daily aggregations for the last 7 days
        FOR i IN 0..6 LOOP
            start_date := (NOW() - INTERVAL '1 day' * i)::DATE;
            end_date := start_date + INTERVAL '1 day';
            
            INSERT INTO activity_aggregations (
                user_id, aggregation_type, period_start, period_end,
                activity_counts, total_activities, total_duration_ms, unique_sessions,
                device_breakdown, platform_breakdown, hourly_distribution
            )
            SELECT 
                user_record.user_id,
                'daily',
                start_date::TIMESTAMPTZ,
                end_date::TIMESTAMPTZ,
                jsonb_object_agg(activity_type, activity_count) AS activity_counts,
                SUM(activity_count)::INTEGER AS total_activities,
                COALESCE(SUM(total_duration), 0)::BIGINT AS total_duration_ms,
                COUNT(DISTINCT session_id)::INTEGER AS unique_sessions,
                jsonb_object_agg(COALESCE(device_type, 'unknown'), device_count) FILTER (WHERE device_type IS NOT NULL) AS device_breakdown,
                jsonb_object_agg(COALESCE(platform, 'unknown'), platform_count) FILTER (WHERE platform IS NOT NULL) AS platform_breakdown,
                jsonb_object_agg(hour_of_day::TEXT, hour_count) AS hourly_distribution
            FROM (
                SELECT 
                    activity_type,
                    COUNT(*) AS activity_count,
                    SUM(COALESCE(duration_ms, 0)) AS total_duration,
                    device_type,
                    COUNT(*) FILTER (WHERE device_type IS NOT NULL) AS device_count,
                    platform,
                    COUNT(*) FILTER (WHERE platform IS NOT NULL) AS platform_count,
                    EXTRACT(HOUR FROM timestamp) AS hour_of_day,
                    COUNT(*) AS hour_count,
                    session_id
                FROM user_activities
                WHERE user_id = user_record.user_id
                    AND timestamp >= start_date::TIMESTAMPTZ
                    AND timestamp < end_date::TIMESTAMPTZ
                GROUP BY activity_type, device_type, platform, hour_of_day, session_id
            ) subq
            GROUP BY user_record.user_id
            ON CONFLICT (user_id, aggregation_type, period_start)
            DO UPDATE SET
                activity_counts = EXCLUDED.activity_counts,
                total_activities = EXCLUDED.total_activities,
                total_duration_ms = EXCLUDED.total_duration_ms,
                unique_sessions = EXCLUDED.unique_sessions,
                device_breakdown = EXCLUDED.device_breakdown,
                platform_breakdown = EXCLUDED.platform_breakdown,
                hourly_distribution = EXCLUDED.hourly_distribution,
                computed_at = NOW();
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update user last_active_at when activities are recorded
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET last_active_at = NEW.timestamp 
    WHERE id = NEW.user_id 
        AND (last_active_at IS NULL OR last_active_at < NEW.timestamp);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_last_active
    AFTER INSERT ON user_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_active();

-- Add comments for documentation
COMMENT ON TABLE user_activities IS 'Stores all user activity events for analytics and behavior tracking';
COMMENT ON TABLE activity_insights IS 'Stores generated insights about user behavior and engagement patterns';
COMMENT ON TABLE activity_recommendations IS 'Stores personalized recommendations based on user activity analysis';
COMMENT ON TABLE activity_aggregations IS 'Pre-computed activity aggregations for performance optimization';

COMMENT ON COLUMN user_activities.activity_type IS 'Type of activity performed by the user';
COMMENT ON COLUMN user_activities.metadata IS 'Additional context data specific to the activity type';
COMMENT ON COLUMN user_activities.duration_ms IS 'Duration of the activity in milliseconds (if applicable)';

COMMENT ON COLUMN activity_insights.severity IS 'Severity level: info, warning, or critical';
COMMENT ON COLUMN activity_insights.category IS 'Category: engagement, performance, behavior, content, or schedule';
COMMENT ON COLUMN activity_insights.expires_at IS 'When this insight becomes irrelevant and should be cleaned up';

COMMENT ON COLUMN activity_recommendations.priority IS 'Priority level from 1-10, higher numbers are more important';
COMMENT ON COLUMN activity_recommendations.applied IS 'Whether the user has acted on this recommendation';

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_activities TO user_service_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON activity_insights TO user_service_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON activity_recommendations TO user_service_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON activity_aggregations TO user_service_role;