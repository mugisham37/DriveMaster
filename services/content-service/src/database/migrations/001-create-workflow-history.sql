-- Migration: Create workflow_history table
-- Description: Add workflow history tracking for content approval process

CREATE TYPE workflow_action AS ENUM (
    'created',
    'submitted_for_review',
    'assigned_reviewer',
    'approved',
    'rejected',
    'published',
    'archived',
    'restored',
    'updated'
);

CREATE TABLE workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    action workflow_action NOT NULL,
    performed_by UUID NOT NULL,
    previous_status item_status NOT NULL,
    new_status item_status NOT NULL,
    comments TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_workflow_history_item_id_created_at ON workflow_history(item_id, created_at DESC);
CREATE INDEX idx_workflow_history_performed_by_created_at ON workflow_history(performed_by, created_at DESC);
CREATE INDEX idx_workflow_history_action ON workflow_history(action);
CREATE INDEX idx_workflow_history_created_at ON workflow_history(created_at DESC);

-- Add foreign key constraint to items table
ALTER TABLE workflow_history 
ADD CONSTRAINT fk_workflow_history_item_id 
FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON TABLE workflow_history IS 'Tracks all workflow state changes for content items including approvals, rejections, and publications';
COMMENT ON COLUMN workflow_history.metadata IS 'Additional context data for the workflow action (JSON format)';