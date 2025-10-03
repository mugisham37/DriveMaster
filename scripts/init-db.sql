-- Database initialization script for Adaptive Learning Platform
-- This script sets up the basic database structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE item_status AS ENUM ('draft', 'under_review', 'approved', 'published', 'archived');
CREATE TYPE session_type AS ENUM ('practice', 'review', 'mock_test', 'placement');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    hashed_password VARCHAR(255),
    country_code VARCHAR(2) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(5) DEFAULT 'en',
    preferences JSONB DEFAULT '{}',
    
    -- Security fields
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- OAuth providers
CREATE TABLE IF NOT EXISTS oauth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token_hash VARCHAR(255),
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content items
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    
    -- Content structure
    content JSONB NOT NULL,
    choices JSONB NOT NULL,
    correct JSONB NOT NULL,
    explanation JSONB,
    
    -- ML parameters
    difficulty FLOAT NOT NULL DEFAULT 0.0,
    discrimination FLOAT DEFAULT 1.0,
    guessing FLOAT DEFAULT 0.25,
    
    -- Classification
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
    
    -- Workflow
    version INTEGER DEFAULT 1,
    status item_status DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Skill mastery tracking
CREATE TABLE IF NOT EXISTS skill_mastery (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(100) NOT NULL,
    mastery FLOAT NOT NULL CHECK (mastery >= 0 AND mastery <= 1),
    confidence FLOAT DEFAULT 0.5,
    last_practiced TIMESTAMPTZ NOT NULL,
    practice_count INTEGER DEFAULT 0,
    correct_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, topic)
);

-- User scheduler state
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
    consecutive_days INTEGER DEFAULT 0,
    total_study_time_ms BIGINT DEFAULT 0,
    
    -- Versioning for optimistic locking
    version INTEGER DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_jurisdictions ON items USING GIN(jurisdictions);
CREATE INDEX IF NOT EXISTS idx_items_topics ON items USING GIN(topics);
CREATE INDEX IF NOT EXISTS idx_items_difficulty ON items(difficulty);
CREATE INDEX IF NOT EXISTS idx_items_published ON items(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_mastery_user ON skill_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_topic ON skill_mastery(topic);
CREATE INDEX IF NOT EXISTS idx_mastery_last_practiced ON skill_mastery(last_practiced);

CREATE INDEX IF NOT EXISTS idx_scheduler_state_updated ON user_scheduler_state(last_updated);
CREATE INDEX IF NOT EXISTS idx_scheduler_state_session ON user_scheduler_state(last_session_end);

-- Insert sample data for development
INSERT INTO users (email, country_code, email_verified) VALUES 
('admin@example.com', 'US', true),
('user@example.com', 'CA', true)
ON CONFLICT (email) DO NOTHING;

-- Insert sample content items
INSERT INTO items (slug, content, choices, correct, topics, jurisdictions, status) VALUES 
(
    'sample-traffic-sign-1',
    '{"text": "What does this traffic sign mean?", "image": "stop-sign.jpg"}',
    '["Stop completely", "Yield to traffic", "Slow down", "No entry"]',
    '["Stop completely"]',
    '["traffic_signs", "road_rules"]',
    '["US", "CA"]',
    'published'
),
(
    'sample-right-of-way-1',
    '{"text": "At a four-way stop, who has the right of way?"}',
    '["First to arrive", "Vehicle on the right", "Largest vehicle", "Fastest vehicle"]',
    '["First to arrive"]',
    '["right_of_way", "intersections"]',
    '["US", "CA"]',
    'published'
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;