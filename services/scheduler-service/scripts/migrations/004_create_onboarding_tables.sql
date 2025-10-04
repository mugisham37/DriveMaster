-- Migration: Create onboarding tables
-- Description: Creates tables for user onboarding state and analytics

-- User onboarding state table
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    stage VARCHAR(50) NOT NULL,
    onboarding_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_active_user_onboarding UNIQUE (user_id) WHERE is_active = TRUE
);

-- Onboarding analytics table
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    completion_time_seconds INTEGER NOT NULL,
    satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    feedback TEXT,
    placement_completed BOOLEAN DEFAULT FALSE,
    recommended_level VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Placement test sessions table (for tracking placement test progress)
CREATE TABLE IF NOT EXISTS placement_test_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'in_progress', 'completed', 'abandoned'
    items_administered INTEGER DEFAULT 0,
    overall_ability FLOAT DEFAULT 0.0,
    overall_se FLOAT DEFAULT 1.0,
    topic_abilities JSONB DEFAULT '{}',
    topic_confidence JSONB DEFAULT '{}',
    placement_data JSONB, -- Full placement test state
    results JSONB, -- Final placement results
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning paths table
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    recommended_level VARCHAR(50) NOT NULL,
    focus_topics JSONB NOT NULL DEFAULT '[]',
    study_plan JSONB NOT NULL DEFAULT '{}',
    milestones JSONB NOT NULL DEFAULT '[]',
    estimated_duration_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning milestone progress table
CREATE TABLE IF NOT EXISTS milestone_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    milestone_id VARCHAR(255) NOT NULL,
    learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_accuracy FLOAT NOT NULL,
    current_accuracy FLOAT DEFAULT 0.0,
    required_topics JSONB NOT NULL DEFAULT '[]',
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    estimated_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_milestone UNIQUE (user_id, milestone_id)
);

-- Onboarding stage transitions table (for analytics)
CREATE TABLE IF NOT EXISTS onboarding_stage_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50) NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    interaction_count INTEGER DEFAULT 0,
    transition_time TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_onboarding_transitions_user (user_id),
    INDEX idx_onboarding_transitions_time (transition_time)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_stage ON user_onboarding(stage);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_country ON user_onboarding(country_code);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_created ON user_onboarding(created_at);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_country ON onboarding_analytics(country_code);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created ON onboarding_analytics(created_at);

CREATE INDEX IF NOT EXISTS idx_placement_sessions_user_id ON placement_test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_placement_sessions_session_id ON placement_test_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_placement_sessions_status ON placement_test_sessions(status);
CREATE INDEX IF NOT EXISTS idx_placement_sessions_started ON placement_test_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_path_id ON learning_paths(path_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_active ON learning_paths(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_milestone_progress_user_id ON milestone_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_milestone_id ON milestone_progress(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_completed ON milestone_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_milestone_progress_estimated_date ON milestone_progress(estimated_date);

-- Add comments for documentation
COMMENT ON TABLE user_onboarding IS 'Stores the current onboarding state for each user';
COMMENT ON TABLE onboarding_analytics IS 'Tracks completion analytics and user feedback for onboarding';
COMMENT ON TABLE placement_test_sessions IS 'Tracks placement test sessions and results';
COMMENT ON TABLE learning_paths IS 'Stores personalized learning paths generated from onboarding';
COMMENT ON TABLE milestone_progress IS 'Tracks progress towards learning milestones';
COMMENT ON TABLE onboarding_stage_transitions IS 'Analytics table for tracking user progression through onboarding stages';

COMMENT ON COLUMN user_onboarding.onboarding_data IS 'Complete onboarding state stored as JSONB';
COMMENT ON COLUMN placement_test_sessions.placement_data IS 'Full placement test algorithm state';
COMMENT ON COLUMN placement_test_sessions.results IS 'Final placement test results and recommendations';
COMMENT ON COLUMN learning_paths.focus_topics IS 'Array of topic recommendations with priorities';
COMMENT ON COLUMN learning_paths.study_plan IS 'Personalized study schedule and preferences';
COMMENT ON COLUMN learning_paths.milestones IS 'Learning milestones and target dates';