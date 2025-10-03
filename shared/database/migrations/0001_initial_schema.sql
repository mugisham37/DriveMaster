-- Migration: Initial Schema
-- Created: 2024-01-01T00:00:00.000Z
-- Description: Create initial database schema with all core tables

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('learner', 'content_author', 'content_reviewer', 'admin');
CREATE TYPE item_status AS ENUM ('draft', 'under_review', 'approved', 'published', 'archived');
CREATE TYPE session_type AS ENUM ('practice', 'review', 'mock_test', 'placement');

-- Users table with comprehensive security and audit fields
CREATE TABLE users (
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
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE items (
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
    estimated_time INTEGER DEFAULT 60,
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

-- Item versions table for content versioning
CREATE TABLE item_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    
    -- Snapshot of content at this version
    content JSONB NOT NULL,
    choices JSONB NOT NULL,
    correct JSONB NOT NULL,
    explanation JSONB,
    
    -- Change metadata
    change_description TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content approval workflow
CREATE TABLE content_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_type session_type NOT NULL,
    
    -- Session metadata
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    items_attempted INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    total_time_ms BIGINT DEFAULT 0,
    
    -- Context
    device_type VARCHAR(20),
    app_version VARCHAR(20),
    
    -- Analytics
    topics_practiced JSONB DEFAULT '[]',
    average_difficulty FLOAT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attempts table (partitioned by date for scalability)
CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id),
    
    -- Response data
    selected JSONB NOT NULL,
    correct BOOLEAN NOT NULL,
    quality INTEGER CHECK (quality >= 0 AND quality <= 5),
    confidence INTEGER CHECK (confidence >= 1 AND confidence <= 5),
    time_taken_ms INTEGER NOT NULL CHECK (time_taken_ms > 0),
    hints_used INTEGER DEFAULT 0 CHECK (hints_used >= 0),
    
    -- Context
    client_attempt_id UUID UNIQUE NOT NULL,
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
CREATE TABLE attempts_2024 PARTITION OF attempts
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Skill mastery tracking
CREATE TABLE skill_mastery (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE user_scheduler_state (
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

-- Placement test results
CREATE TABLE placement_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id),
    
    -- Test configuration
    topics JSONB NOT NULL,
    item_count INTEGER NOT NULL,
    
    -- Results
    ability_estimates JSONB NOT NULL,
    confidence_intervals JSONB NOT NULL,
    standard_error JSONB NOT NULL,
    
    -- Test metadata
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning goals and milestones
CREATE TABLE learning_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Goal definition
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_topics JSONB NOT NULL,
    target_mastery FLOAT DEFAULT 0.8,
    target_date TIMESTAMPTZ,
    
    -- Progress tracking
    current_mastery FLOAT DEFAULT 0.0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics tables
CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB DEFAULT '{}',
    
    -- Context
    device_type VARCHAR(20),
    app_version VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    
    -- Timing
    duration INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE item_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    -- Time period for this analytics record
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Performance metrics
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    average_time_ms INTEGER DEFAULT 0,
    average_hints_used FLOAT DEFAULT 0.0,
    
    -- IRT parameter updates
    difficulty_estimate FLOAT,
    discrimination_estimate FLOAT,
    guessing_estimate FLOAT,
    
    -- User distribution
    unique_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    
    -- Audit
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE topic_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic VARCHAR(100) NOT NULL,
    
    -- Time period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Performance metrics
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    average_time_ms INTEGER DEFAULT 0,
    
    -- Mastery metrics
    average_mastery FLOAT DEFAULT 0.0,
    users_above_threshold INTEGER DEFAULT 0,
    total_active_users INTEGER DEFAULT 0,
    
    -- Learning progression
    average_time_to_mastery BIGINT,
    average_attempts_to_mastery INTEGER,
    
    -- Audit
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_engagement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Engagement metrics
    sessions_count INTEGER DEFAULT 0,
    total_study_time_ms BIGINT DEFAULT 0,
    average_session_time_ms INTEGER DEFAULT 0,
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    
    -- Streak and consistency
    longest_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    active_days INTEGER DEFAULT 0,
    
    -- Progress metrics
    topics_mastered INTEGER DEFAULT 0,
    average_mastery_gain FLOAT DEFAULT 0.0,
    
    -- Retention indicators
    is_retained BOOLEAN DEFAULT TRUE,
    risk_score FLOAT DEFAULT 0.0,
    
    -- Audit
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric identification
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
    
    -- Metric value
    value FLOAT NOT NULL,
    unit VARCHAR(20),
    
    -- Context
    service VARCHAR(50),
    environment VARCHAR(20) DEFAULT 'development',
    tags JSONB DEFAULT '{}',
    
    -- Timing
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ab_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Test identification
    test_name VARCHAR(100) NOT NULL,
    variant VARCHAR(50) NOT NULL,
    
    -- User assignment
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Outcome metrics
    conversion_event VARCHAR(100),
    converted BOOLEAN DEFAULT FALSE,
    conversion_value FLOAT,
    
    -- Context
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;