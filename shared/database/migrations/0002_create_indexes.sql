-- Migration: Create Indexes
-- Created: 2024-01-01T00:01:00.000Z
-- Description: Create comprehensive indexes for query performance

BEGIN;

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_country_code ON users(country_code);
CREATE INDEX idx_users_last_active ON users(last_active_at);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_role ON users(user_role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- OAuth providers indexes
CREATE INDEX idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX idx_oauth_providers_provider ON oauth_providers(provider);

-- Refresh tokens indexes
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;

-- Items table indexes
CREATE INDEX idx_items_slug ON items(slug);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_jurisdictions ON items USING GIN(jurisdictions);
CREATE INDEX idx_items_topics ON items USING GIN(topics);
CREATE INDEX idx_items_difficulty ON items(difficulty);
CREATE INDEX idx_items_published ON items(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_items_active ON items(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_items_created_by ON items(created_by);
CREATE INDEX idx_items_content_search ON items USING GIN(to_tsvector('english', content->>'text'));

-- Item versions indexes
CREATE INDEX idx_item_versions_item_id ON item_versions(item_id);
CREATE INDEX idx_item_versions_version ON item_versions(item_id, version);

-- Content reviews indexes
CREATE INDEX idx_content_reviews_item_id ON content_reviews(item_id);
CREATE INDEX idx_content_reviews_reviewer_id ON content_reviews(reviewer_id);
CREATE INDEX idx_content_reviews_status ON content_reviews(status);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_session_type ON sessions(session_type);

-- Attempts table indexes
CREATE INDEX idx_attempts_user_time ON attempts(user_id, timestamp DESC);
CREATE INDEX idx_attempts_item ON attempts(item_id);
CREATE INDEX idx_attempts_session ON attempts(session_id);
CREATE INDEX idx_attempts_client_id ON attempts(client_attempt_id);
CREATE INDEX idx_attempts_correct ON attempts(correct);
CREATE INDEX idx_attempts_timestamp ON attempts(timestamp);

-- Skill mastery indexes
CREATE INDEX idx_mastery_user ON skill_mastery(user_id);
CREATE INDEX idx_mastery_topic ON skill_mastery(topic);
CREATE INDEX idx_mastery_last_practiced ON skill_mastery(last_practiced);
CREATE INDEX idx_mastery_mastery_level ON skill_mastery(mastery);

-- Scheduler state indexes
CREATE INDEX idx_scheduler_state_updated ON user_scheduler_state(last_updated);
CREATE INDEX idx_scheduler_state_session ON user_scheduler_state(last_session_end);

-- Placement tests indexes
CREATE INDEX idx_placement_tests_user_id ON placement_tests(user_id);
CREATE INDEX idx_placement_tests_session_id ON placement_tests(session_id);
CREATE INDEX idx_placement_tests_completed_at ON placement_tests(completed_at);

-- Learning goals indexes
CREATE INDEX idx_learning_goals_user_id ON learning_goals(user_id);
CREATE INDEX idx_learning_goals_target_date ON learning_goals(target_date);
CREATE INDEX idx_learning_goals_completed ON learning_goals(is_completed);

-- Analytics indexes
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_timestamp ON user_activity(timestamp);
CREATE INDEX idx_user_activity_type ON user_activity(activity_type);

CREATE INDEX idx_item_analytics_item_id ON item_analytics(item_id);
CREATE INDEX idx_item_analytics_period ON item_analytics(period_start, period_end);

CREATE INDEX idx_topic_analytics_topic ON topic_analytics(topic);
CREATE INDEX idx_topic_analytics_period ON topic_analytics(period_start, period_end);

CREATE INDEX idx_user_engagement_user_id ON user_engagement(user_id);
CREATE INDEX idx_user_engagement_period ON user_engagement(period_start, period_end);
CREATE INDEX idx_user_engagement_risk_score ON user_engagement(risk_score) WHERE risk_score > 0.5;

CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_service ON system_metrics(service);

CREATE INDEX idx_ab_test_results_test_name ON ab_test_results(test_name);
CREATE INDEX idx_ab_test_results_user_id ON ab_test_results(user_id);
CREATE INDEX idx_ab_test_results_variant ON ab_test_results(variant);

COMMIT;