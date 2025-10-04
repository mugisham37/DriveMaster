-- Migration: Create SM-2 states table
-- Description: Creates table to store SM-2 spaced repetition algorithm states for user-item pairs

-- Create SM-2 states table
CREATE TABLE IF NOT EXISTS sm2_states (
    user_id UUID NOT NULL,
    item_id UUID NOT NULL,
    
    -- SM-2 algorithm parameters
    easiness_factor DECIMAL(4,2) NOT NULL DEFAULT 2.50 CHECK (easiness_factor >= 1.30 AND easiness_factor <= 3.00),
    interval_days INTEGER NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
    repetition INTEGER NOT NULL DEFAULT 0 CHECK (repetition >= 0),
    
    -- Scheduling information
    next_due TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_reviewed TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Primary key and constraints
    PRIMARY KEY (user_id, item_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sm2_states_user_id ON sm2_states(user_id);
CREATE INDEX IF NOT EXISTS idx_sm2_states_item_id ON sm2_states(item_id);
CREATE INDEX IF NOT EXISTS idx_sm2_states_next_due ON sm2_states(next_due);
CREATE INDEX IF NOT EXISTS idx_sm2_states_user_next_due ON sm2_states(user_id, next_due);
CREATE INDEX IF NOT EXISTS idx_sm2_states_last_reviewed ON sm2_states(last_reviewed);

-- Create partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sm2_states_due_items ON sm2_states(user_id, item_id) 
    WHERE next_due <= NOW();

CREATE INDEX IF NOT EXISTS idx_sm2_states_overdue_items ON sm2_states(user_id, item_id, next_due) 
    WHERE next_due < NOW();

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sm2_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_sm2_states_updated_at ON sm2_states;
CREATE TRIGGER trigger_update_sm2_states_updated_at
    BEFORE UPDATE ON sm2_states
    FOR EACH ROW
    EXECUTE FUNCTION update_sm2_states_updated_at();

-- Add comments for documentation
COMMENT ON TABLE sm2_states IS 'Stores SM-2 spaced repetition algorithm states for user-item pairs';
COMMENT ON COLUMN sm2_states.user_id IS 'Reference to the user';
COMMENT ON COLUMN sm2_states.item_id IS 'Reference to the learning item';
COMMENT ON COLUMN sm2_states.easiness_factor IS 'SM-2 easiness factor (1.3-3.0), higher means easier to remember';
COMMENT ON COLUMN sm2_states.interval_days IS 'Current interval in days between reviews';
COMMENT ON COLUMN sm2_states.repetition IS 'Number of successful repetitions';
COMMENT ON COLUMN sm2_states.next_due IS 'When this item is next due for review';
COMMENT ON COLUMN sm2_states.last_reviewed IS 'When this item was last reviewed';

-- Create view for analytics and reporting
CREATE OR REPLACE VIEW sm2_analytics AS
SELECT 
    user_id,
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE next_due <= NOW()) as due_items,
    COUNT(*) FILTER (WHERE next_due < NOW()) as overdue_items,
    AVG(easiness_factor) as avg_easiness_factor,
    AVG(interval_days) as avg_interval_days,
    AVG(repetition) as avg_repetitions,
    COUNT(*) FILTER (WHERE repetition = 0) as new_items,
    COUNT(*) FILTER (WHERE repetition = 1) as learning_items,
    COUNT(*) FILTER (WHERE repetition = 2) as young_items,
    COUNT(*) FILTER (WHERE repetition > 2 AND interval_days < 30) as mature_items,
    COUNT(*) FILTER (WHERE interval_days >= 30) as mastered_items,
    MIN(next_due) as earliest_due,
    MAX(next_due) as latest_due,
    MIN(last_reviewed) as oldest_review,
    MAX(last_reviewed) as newest_review
FROM sm2_states
GROUP BY user_id;

COMMENT ON VIEW sm2_analytics IS 'Analytics view for SM-2 states per user';

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sm2_states TO scheduler_service;
-- GRANT SELECT ON sm2_analytics TO scheduler_service;
-- GRANT USAGE ON SEQUENCE sm2_states_id_seq TO scheduler_service;