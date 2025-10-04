-- Migration: Create IRT states table
-- Description: Creates table for storing Item Response Theory ability states per user and topic

-- Create irt_states table
CREATE TABLE IF NOT EXISTS irt_states (
    user_id UUID NOT NULL,
    topic VARCHAR(100) NOT NULL,
    theta DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
    theta_variance DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
    confidence DECIMAL(5,4) NOT NULL DEFAULT 0.1000,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (user_id, topic),
    
    -- Constraints
    CONSTRAINT irt_states_theta_range CHECK (theta >= -5.0 AND theta <= 5.0),
    CONSTRAINT irt_states_variance_positive CHECK (theta_variance > 0),
    CONSTRAINT irt_states_confidence_range CHECK (confidence >= 0.0 AND confidence <= 1.0),
    CONSTRAINT irt_states_attempts_non_negative CHECK (attempts_count >= 0),
    CONSTRAINT irt_states_correct_non_negative CHECK (correct_count >= 0),
    CONSTRAINT irt_states_correct_not_exceed_attempts CHECK (correct_count <= attempts_count)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_irt_states_user_id ON irt_states(user_id);
CREATE INDEX IF NOT EXISTS idx_irt_states_topic ON irt_states(topic);
CREATE INDEX IF NOT EXISTS idx_irt_states_last_updated ON irt_states(last_updated);
CREATE INDEX IF NOT EXISTS idx_irt_states_confidence ON irt_states(confidence);
CREATE INDEX IF NOT EXISTS idx_irt_states_theta ON irt_states(theta);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_irt_states_user_confidence ON irt_states(user_id, confidence);
CREATE INDEX IF NOT EXISTS idx_irt_states_topic_theta ON irt_states(topic, theta);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_irt_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_irt_states_updated_at
    BEFORE UPDATE ON irt_states
    FOR EACH ROW
    EXECUTE FUNCTION update_irt_states_updated_at();

-- Add comments for documentation
COMMENT ON TABLE irt_states IS 'Stores Item Response Theory ability states for users per topic';
COMMENT ON COLUMN irt_states.user_id IS 'Reference to user ID';
COMMENT ON COLUMN irt_states.topic IS 'Topic name for which ability is tracked';
COMMENT ON COLUMN irt_states.theta IS 'IRT ability parameter (typically -3 to +3 range)';
COMMENT ON COLUMN irt_states.theta_variance IS 'Uncertainty in theta estimate';
COMMENT ON COLUMN irt_states.confidence IS 'Confidence level in ability estimate (0-1)';
COMMENT ON COLUMN irt_states.attempts_count IS 'Total number of attempts for this topic';
COMMENT ON COLUMN irt_states.correct_count IS 'Number of correct attempts for this topic';
COMMENT ON COLUMN irt_states.last_updated IS 'Timestamp of last state update';