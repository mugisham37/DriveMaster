-- Migration: Create Views
-- Created: 2024-01-01T00:03:00.000Z
-- Description: Create monitoring and analytics views

BEGIN;

-- System health monitoring view
CREATE OR REPLACE VIEW system_health AS
SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size(current_database())) as value,
    NOW() as checked_at
UNION ALL
SELECT 
    'Active Connections' as metric,
    COUNT(*)::TEXT as value,
    NOW() as checked_at
FROM pg_stat_activity 
WHERE datname = current_database() AND state = 'active'
UNION ALL
SELECT 
    'Total Users' as metric,
    COUNT(*)::TEXT as value,
    NOW() as checked_at
FROM users WHERE is_active = TRUE
UNION ALL
SELECT 
    'Published Items' as metric,
    COUNT(*)::TEXT as value,
    NOW() as checked_at
FROM items WHERE status = 'published' AND is_active = TRUE
UNION ALL
SELECT 
    'Total Attempts Today' as metric,
    COUNT(*)::TEXT as value,
    NOW() as checked_at
FROM attempts WHERE created_at >= CURRENT_DATE;

-- Connection monitoring view
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity 
WHERE datname = current_database();

-- Slow queries view (requires pg_stat_statements extension)
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_exec_time > 1000  -- queries taking more than 1 second on average
ORDER BY mean_exec_time DESC;

-- Table size monitoring view
CREATE OR REPLACE VIEW table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage monitoring view
CREATE OR REPLACE VIEW index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

-- User engagement summary view
CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT 
    u.id,
    u.email,
    u.country_code,
    u.created_at as user_since,
    u.last_active_at,
    COALESCE(s.session_count, 0) as total_sessions,
    COALESCE(s.total_study_time_hours, 0) as total_study_hours,
    COALESCE(a.total_attempts, 0) as total_attempts,
    COALESCE(a.correct_attempts, 0) as correct_attempts,
    CASE 
        WHEN COALESCE(a.total_attempts, 0) > 0 
        THEN ROUND((COALESCE(a.correct_attempts, 0)::FLOAT / a.total_attempts * 100), 2)
        ELSE 0 
    END as success_rate_percent,
    COALESCE(m.topics_practiced, 0) as topics_practiced,
    COALESCE(m.avg_mastery, 0) as average_mastery
FROM users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as session_count,
        ROUND(SUM(total_time_ms)::FLOAT / 3600000, 2) as total_study_time_hours
    FROM sessions 
    GROUP BY user_id
) s ON u.id = s.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_attempts,
        SUM(CASE WHEN correct THEN 1 ELSE 0 END) as correct_attempts
    FROM attempts 
    GROUP BY user_id
) a ON u.id = a.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(DISTINCT topic) as topics_practiced,
        ROUND(AVG(mastery), 3) as avg_mastery
    FROM skill_mastery 
    GROUP BY user_id
) m ON u.id = m.user_id
WHERE u.is_active = TRUE;

-- Content performance view
CREATE OR REPLACE VIEW content_performance AS
SELECT 
    i.id,
    i.slug,
    i.status,
    i.difficulty,
    i.topics,
    i.jurisdictions,
    i.usage_count,
    i.success_rate,
    i.avg_response_time,
    COALESCE(a.attempts_last_30_days, 0) as attempts_last_30_days,
    COALESCE(a.success_rate_last_30_days, 0) as success_rate_last_30_days,
    i.created_at,
    i.published_at
FROM items i
LEFT JOIN (
    SELECT 
        item_id,
        COUNT(*) as attempts_last_30_days,
        ROUND(AVG(CASE WHEN correct THEN 1.0 ELSE 0.0 END), 3) as success_rate_last_30_days
    FROM attempts 
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY item_id
) a ON i.id = a.item_id
WHERE i.is_active = TRUE;

-- Topic mastery overview
CREATE OR REPLACE VIEW topic_mastery_overview AS
SELECT 
    topic,
    COUNT(DISTINCT user_id) as total_users,
    COUNT(DISTINCT user_id) FILTER (WHERE mastery >= 0.8) as users_mastered,
    ROUND(AVG(mastery), 3) as avg_mastery,
    ROUND(AVG(confidence), 3) as avg_confidence,
    SUM(practice_count) as total_practice_count,
    ROUND(AVG(practice_count), 1) as avg_practice_count,
    MAX(last_practiced) as last_activity
FROM skill_mastery
GROUP BY topic
ORDER BY avg_mastery DESC;

-- Learning progress view
CREATE OR REPLACE VIEW learning_progress AS
SELECT 
    u.id as user_id,
    u.email,
    lg.title as goal_title,
    lg.target_mastery,
    lg.current_mastery,
    lg.target_date,
    lg.is_completed,
    lg.completed_at,
    CASE 
        WHEN lg.target_date IS NOT NULL AND lg.target_date < NOW() AND NOT lg.is_completed 
        THEN 'overdue'
        WHEN lg.target_date IS NOT NULL AND lg.target_date < NOW() + INTERVAL '7 days' AND NOT lg.is_completed
        THEN 'due_soon'
        WHEN lg.is_completed 
        THEN 'completed'
        ELSE 'on_track'
    END as status,
    ROUND((lg.current_mastery / lg.target_mastery * 100), 1) as progress_percent
FROM users u
JOIN learning_goals lg ON u.id = lg.user_id
WHERE u.is_active = TRUE;

-- Recent activity view
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'attempt' as activity_type,
    a.user_id,
    u.email,
    i.slug as item_slug,
    a.correct,
    a.time_taken_ms,
    a.timestamp as activity_time
FROM attempts a
JOIN users u ON a.user_id = u.id
JOIN items i ON a.item_id = i.id
WHERE a.timestamp >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'session_start' as activity_type,
    s.user_id,
    u.email,
    s.session_type::TEXT as item_slug,
    NULL as correct,
    NULL as time_taken_ms,
    s.start_time as activity_time
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.start_time >= NOW() - INTERVAL '24 hours'

ORDER BY activity_time DESC
LIMIT 100;

COMMIT;