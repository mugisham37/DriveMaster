-- Migration: Add BKT States Table
-- Created: 2024-01-15T00:00:00.000Z
-- Description: Create dedicated table for Bayesian Knowledge Tracing states for better performance and querying

BEGIN;

-- Create BKT states table for topic-based knowledge tracking
CREATE TABLE bkt_states (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic VARCHAR(100) NOT NULL,
    
    -- BKT probability parameters
    prob_knowledge DECIMAL(5,4) NOT NULL DEFAULT 0.1000 CHECK (prob_knowledge >= 0 AND prob_knowledge <= 1),
    prob_guess DECIMAL(5,4) NOT NULL DEFAULT 0.2500 CHECK (prob_guess >= 0 AND prob_guess <= 1),
    prob_slip DECIMAL(5,4) NOT NULL DEFAULT 0.1000 CHECK (prob_slip >= 0 AND prob_slip <= 1),
    prob_learn DECIMAL(5,4) NOT NULL DEFAULT 0.1500 CHECK (prob_learn >= 0 AND prob_learn <= 1),
    
    -- Attempt tracking
    attempts_count INTEGER NOT NULL DEFAULT 0 CHECK (attempts_count >= 0),
    correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
    
    -- Confidence and metadata
    confidence DECIMAL(5,4) NOT NULL DEFAULT 0.1000 CHECK (confidence >= 0 AND confidence <= 1),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Primary key and constraints
    PRIMARY KEY (user_id, topic),
    CONSTRAINT valid_correct_count CHECK (correct_count <= attempts_count)
);

-- Create SM-2 states table for item-based spaced repetition
CREATE TABLE sm2_states (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    
    -- SM-2 algorithm parameters
    easiness_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50 CHECK (easiness_factor >= 1.30 AND easiness_factor <= 2.50),
    interval_days INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
    repetition INTEGER NOT NULL DEFAULT 0 CHECK (repetition >= 0),
    
    -- Scheduling
    next_due TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Primary key
    PRIMARY KEY (user_id, item_id)
);

-- Add indexes for performance
CREATE INDEX idx_bkt_states_user_id ON bkt_states(user_id);
CREATE INDEX idx_bkt_states_topic ON bkt_states(topic);
CREATE INDEX idx_bkt_states_prob_knowledge ON bkt_states(prob_knowledge);
CREATE INDEX idx_bkt_states_last_updated ON bkt_states(last_updated);
CREATE INDEX idx_bkt_states_mastery ON bkt_states(user_id, prob_knowledge) WHERE prob_knowledge >= 0.85;

CREATE INDEX idx_sm2_states_user_id ON sm2_states(user_id);
CREATE INDEX idx_sm2_states_item_id ON sm2_states(item_id);
CREATE INDEX idx_sm2_states_next_due ON sm2_states(next_due);
CREATE INDEX idx_sm2_states_due_items ON sm2_states(user_id, next_due) WHERE next_due <= NOW();

-- Add triggers for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bkt_states_updated_at 
    BEFORE UPDATE ON bkt_states 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sm2_states_updated_at 
    BEFORE UPDATE ON sm2_states 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE VIEW user_mastery_summary AS
SELECT 
    user_id,
    COUNT(*) as total_topics,
    COUNT(*) FILTER (WHERE prob_knowledge >= 0.85 AND confidence >= 0.7) as mastered_topics,
    AVG(prob_knowledge) as average_knowledge,
    AVG(confidence) as average_confidence,
    SUM(attempts_count) as total_attempts,
    SUM(correct_count) as total_correct,
    CASE 
        WHEN SUM(attempts_count) > 0 
        THEN SUM(correct_count)::FLOAT / SUM(attempts_count) 
        ELSE 0 
    END as overall_accuracy
FROM bkt_states
GROUP BY user_id;

CREATE VIEW topic_difficulty_analysis AS
SELECT 
    topic,
    COUNT(DISTINCT user_id) as user_count,
    AVG(prob_knowledge) as avg_knowledge,
    AVG(confidence) as avg_confidence,
    AVG(attempts_count) as avg_attempts,
    CASE 
        WHEN SUM(attempts_count) > 0 
        THEN SUM(correct_count)::FLOAT / SUM(attempts_count) 
        ELSE 0 
    END as success_rate,
    COUNT(*) FILTER (WHERE prob_knowledge >= 0.85 AND confidence >= 0.7) as mastered_users
FROM bkt_states
GROUP BY topic;

CREATE VIEW due_items_summary AS
SELECT 
    user_id,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE next_due <= NOW()) as due_items,
    COUNT(*) FILTER (WHERE next_due <= NOW() - INTERVAL '1 day') as overdue_items,
    MIN(next_due) as earliest_due,
    MAX(next_due) as latest_due
FROM sm2_states
GROUP BY user_id;

-- Add comments for documentation
COMMENT ON TABLE bkt_states IS 'Bayesian Knowledge Tracing states for topic-based mastery tracking';
COMMENT ON COLUMN bkt_states.prob_knowledge IS 'Probability that the user knows the topic (P(L))';
COMMENT ON COLUMN bkt_states.prob_guess IS 'Probability of guessing correctly when not knowing (P(G))';
COMMENT ON COLUMN bkt_states.prob_slip IS 'Probability of making an error when knowing (P(S))';
COMMENT ON COLUMN bkt_states.prob_learn IS 'Probability of learning from an attempt (P(T))';
COMMENT ON COLUMN bkt_states.confidence IS 'Confidence in the knowledge probability estimate';

COMMENT ON TABLE sm2_states IS 'SuperMemo-2 spaced repetition states for item-based scheduling';
COMMENT ON COLUMN sm2_states.easiness_factor IS 'SM-2 easiness factor (1.3 to 2.5)';
COMMENT ON COLUMN sm2_states.interval_days IS 'Current interval in days';
COMMENT ON COLUMN sm2_states.repetition IS 'Number of successful repetitions';

COMMENT ON VIEW user_mastery_summary IS 'Summary of user mastery across all topics';
COMMENT ON VIEW topic_difficulty_analysis IS 'Analysis of topic difficulty and user performance';
COMMENT ON VIEW due_items_summary IS 'Summary of due and overdue items per user';

COMMIT;