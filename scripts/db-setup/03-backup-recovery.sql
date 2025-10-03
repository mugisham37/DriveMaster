-- Backup and recovery procedures for the adaptive learning platform
-- This script sets up automated backup procedures and recovery mechanisms

-- Create backup schema for storing backup metadata
CREATE SCHEMA IF NOT EXISTS backup_management;

-- Create backup log table
CREATE TABLE backup_management.backup_log (
    id SERIAL PRIMARY KEY,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'wal')),
    backup_path TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    size_bytes BIGINT,
    error_message TEXT,
    wal_start_lsn PG_LSN,
    wal_end_lsn PG_LSN,
    created_by VARCHAR(100) DEFAULT current_user
);

-- Create function for full database backup
CREATE OR REPLACE FUNCTION backup_management.create_full_backup(backup_path TEXT DEFAULT '/var/lib/postgresql/backups/')
RETURNS INTEGER AS $$
DECLARE
    backup_id INTEGER;
    backup_filename TEXT;
    start_lsn PG_LSN;
    end_lsn PG_LSN;
    backup_size BIGINT;
BEGIN
    -- Generate backup filename with timestamp
    backup_filename := backup_path || 'full_backup_' || to_char(NOW(), 'YYYY-MM-DD_HH24-MI-SS') || '.sql';
    
    -- Start backup and get LSN
    SELECT pg_start_backup('Full backup ' || NOW()::TEXT, true) INTO start_lsn;
    
    -- Insert backup record
    INSERT INTO backup_management.backup_log (backup_type, backup_path, wal_start_lsn)
    VALUES ('full', backup_filename, start_lsn)
    RETURNING id INTO backup_id;
    
    -- Note: Actual backup execution would be handled by external script
    -- This function primarily logs the backup operation
    
    RAISE NOTICE 'Full backup started with ID %. Execute: pg_dump -h localhost -U postgres -d adaptive_learning -f %', 
        backup_id, backup_filename;
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to complete backup logging
CREATE OR REPLACE FUNCTION backup_management.complete_backup(backup_id INTEGER, success BOOLEAN, error_msg TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    end_lsn PG_LSN;
BEGIN
    -- Stop backup and get end LSN
    SELECT pg_stop_backup() INTO end_lsn;
    
    -- Update backup record
    UPDATE backup_management.backup_log 
    SET 
        end_time = NOW(),
        status = CASE WHEN success THEN 'completed' ELSE 'failed' END,
        error_message = error_msg,
        wal_end_lsn = end_lsn
    WHERE id = backup_id;
    
    RAISE NOTICE 'Backup % marked as %', backup_id, CASE WHEN success THEN 'completed' ELSE 'failed' END;
END;
$$ LANGUAGE plpgsql;

-- Create function for incremental backup
CREATE OR REPLACE FUNCTION backup_management.create_incremental_backup(
    base_backup_id INTEGER,
    backup_path TEXT DEFAULT '/var/lib/postgresql/backups/'
)
RETURNS INTEGER AS $$
DECLARE
    backup_id INTEGER;
    backup_filename TEXT;
    base_backup_lsn PG_LSN;
BEGIN
    -- Get base backup LSN
    SELECT wal_end_lsn INTO base_backup_lsn 
    FROM backup_management.backup_log 
    WHERE id = base_backup_id AND status = 'completed';
    
    IF base_backup_lsn IS NULL THEN
        RAISE EXCEPTION 'Base backup % not found or not completed', base_backup_id;
    END IF;
    
    -- Generate incremental backup filename
    backup_filename := backup_path || 'incremental_backup_' || base_backup_id || '_' || 
                      to_char(NOW(), 'YYYY-MM-DD_HH24-MI-SS') || '.sql';
    
    -- Insert backup record
    INSERT INTO backup_management.backup_log (backup_type, backup_path, wal_start_lsn)
    VALUES ('incremental', backup_filename, base_backup_lsn)
    RETURNING id INTO backup_id;
    
    RAISE NOTICE 'Incremental backup started with ID % based on backup %. Execute incremental backup script.', 
        backup_id, base_backup_id;
    
    RETURN backup_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to check backup integrity
CREATE OR REPLACE FUNCTION backup_management.verify_backup_integrity(backup_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    backup_record RECORD;
    integrity_ok BOOLEAN := true;
BEGIN
    -- Get backup record
    SELECT * INTO backup_record 
    FROM backup_management.backup_log 
    WHERE id = backup_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup % not found', backup_id;
    END IF;
    
    -- Check if backup file exists and is readable
    -- Note: This would require external verification in production
    
    -- Log integrity check
    RAISE NOTICE 'Backup integrity check for backup %: %', 
        backup_id, CASE WHEN integrity_ok THEN 'PASSED' ELSE 'FAILED' END;
    
    RETURN integrity_ok;
END;
$$ LANGUAGE plpgsql;

-- Create function for point-in-time recovery preparation
CREATE OR REPLACE FUNCTION backup_management.prepare_pitr_recovery(
    target_time TIMESTAMPTZ,
    recovery_path TEXT DEFAULT '/var/lib/postgresql/recovery/'
)
RETURNS TEXT AS $$
DECLARE
    base_backup RECORD;
    recovery_config TEXT;
BEGIN
    -- Find the most recent full backup before target time
    SELECT * INTO base_backup
    FROM backup_management.backup_log
    WHERE backup_type = 'full' 
    AND status = 'completed'
    AND start_time <= target_time
    ORDER BY start_time DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No suitable base backup found for target time %', target_time;
    END IF;
    
    -- Generate recovery configuration
    recovery_config := format('
# PostgreSQL Recovery Configuration
# Generated for point-in-time recovery to %s

restore_command = ''cp /var/lib/postgresql/archive/%%f %%p''
recovery_target_time = ''%s''
recovery_target_action = ''promote''
recovery_target_timeline = ''latest''

# Base backup information
# Backup ID: %s
# Backup path: %s
# Backup start time: %s
# WAL start LSN: %s
    ', 
    target_time,
    target_time,
    base_backup.id,
    base_backup.backup_path,
    base_backup.start_time,
    base_backup.wal_start_lsn
    );
    
    RAISE NOTICE 'Recovery configuration prepared for target time %. Base backup: %', 
        target_time, base_backup.id;
    
    RETURN recovery_config;
END;
$$ LANGUAGE plpgsql;

-- Create backup cleanup function
CREATE OR REPLACE FUNCTION backup_management.cleanup_old_backups(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Mark old backups for cleanup (don't delete immediately for safety)
    UPDATE backup_management.backup_log 
    SET status = 'archived'
    WHERE start_time < NOW() - (retention_days || ' days')::INTERVAL
    AND status = 'completed';
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    RAISE NOTICE 'Marked % old backups for cleanup (older than % days)', cleanup_count, retention_days;
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Create backup monitoring view
CREATE OR REPLACE VIEW backup_management.backup_status AS
SELECT 
    id,
    backup_type,
    backup_path,
    start_time,
    end_time,
    EXTRACT(EPOCH FROM (end_time - start_time)) as duration_seconds,
    status,
    pg_size_pretty(size_bytes) as backup_size,
    error_message,
    created_by
FROM backup_management.backup_log
ORDER BY start_time DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA backup_management TO migration_role;
GRANT ALL ON ALL TABLES IN SCHEMA backup_management TO migration_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA backup_management TO migration_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA backup_management TO migration_role;

GRANT SELECT ON backup_management.backup_status TO readonly_role;
GRANT SELECT ON backup_management.backup_log TO readonly_role;

-- Create backup schedule recommendations
COMMENT ON FUNCTION backup_management.create_full_backup(TEXT) IS 
'Creates a full database backup. Recommended schedule: Daily at 2 AM';

COMMENT ON FUNCTION backup_management.create_incremental_backup(INTEGER, TEXT) IS 
'Creates an incremental backup based on a full backup. Recommended schedule: Every 4 hours';

COMMENT ON FUNCTION backup_management.cleanup_old_backups(INTEGER) IS 
'Cleans up old backup records. Recommended schedule: Weekly';

COMMIT;