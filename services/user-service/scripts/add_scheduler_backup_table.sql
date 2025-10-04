-- Add scheduler state backup table for recovery mechanisms
CREATE TABLE IF NOT EXISTS scheduler_state_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL,
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('manual', 'automatic', 'recovery')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_backup_type CHECK (backup_type IN ('manual', 'automatic', 'recovery'))
);

-- Indexes for backup table
CREATE INDEX IF NOT EXISTS idx_scheduler_backups_user_id ON scheduler_state_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduler_backups_created_at ON scheduler_state_backups(created_at);
CREATE INDEX IF NOT EXISTS idx_scheduler_backups_type ON scheduler_state_backups(backup_type);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduler_state_backups TO app_role;
GRANT SELECT ON scheduler_state_backups TO readonly_role;
GRANT ALL PRIVILEGES ON scheduler_state_backups TO migration_role;