-- Migration: Create Triggers
-- Created: 2024-01-01T00:02:00.000Z
-- Description: Create triggers for automatic timestamp updates and data integrity

BEGIN;

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_providers_updated_at 
    BEFORE UPDATE ON oauth_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at 
    BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_mastery_updated_at 
    BEFORE UPDATE ON skill_mastery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_goals_updated_at 
    BEFORE UPDATE ON learning_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for scheduler state updates
CREATE OR REPLACE FUNCTION update_scheduler_state_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = OLD.version + 1;
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduler_state_version_trigger
    BEFORE UPDATE ON user_scheduler_state
    FOR EACH ROW EXECUTE FUNCTION update_scheduler_state_version();

-- Create trigger for item version tracking
CREATE OR REPLACE FUNCTION create_item_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version if content fields changed
    IF (OLD.content IS DISTINCT FROM NEW.content OR 
        OLD.choices IS DISTINCT FROM NEW.choices OR 
        OLD.correct IS DISTINCT FROM NEW.correct OR 
        OLD.explanation IS DISTINCT FROM NEW.explanation) THEN
        
        INSERT INTO item_versions (
            item_id, version, content, choices, correct, explanation, changed_by
        ) VALUES (
            NEW.id, NEW.version, NEW.content, NEW.choices, NEW.correct, NEW.explanation, NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_item_version_trigger
    AFTER UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION create_item_version();

-- Create trigger for user activity tracking
CREATE OR REPLACE FUNCTION track_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_active_at on any user table update
    NEW.last_active_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_user_activity_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION track_user_activity();

-- Create trigger for automatic session end time
CREATE OR REPLACE FUNCTION set_session_end_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Set end_time when session is updated with final stats
    IF OLD.end_time IS NULL AND NEW.items_attempted > 0 THEN
        NEW.end_time = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_session_end_time_trigger
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION set_session_end_time();

-- Create trigger for learning goal completion
CREATE OR REPLACE FUNCTION check_learning_goal_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark goal as completed if current_mastery reaches target_mastery
    IF NEW.current_mastery >= NEW.target_mastery AND NOT NEW.is_completed THEN
        NEW.is_completed = TRUE;
        NEW.completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_learning_goal_completion_trigger
    BEFORE UPDATE ON learning_goals
    FOR EACH ROW EXECUTE FUNCTION check_learning_goal_completion();

-- Create trigger for item analytics updates
CREATE OR REPLACE FUNCTION update_item_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update item usage statistics when new attempt is recorded
    UPDATE items 
    SET 
        usage_count = usage_count + 1,
        avg_response_time = (
            SELECT AVG(time_taken_ms)::INTEGER 
            FROM attempts 
            WHERE item_id = NEW.item_id
        ),
        success_rate = (
            SELECT AVG(CASE WHEN correct THEN 1.0 ELSE 0.0 END)
            FROM attempts 
            WHERE item_id = NEW.item_id
        )
    WHERE id = NEW.item_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_item_usage_stats_trigger
    AFTER INSERT ON attempts
    FOR EACH ROW EXECUTE FUNCTION update_item_usage_stats();

COMMIT;