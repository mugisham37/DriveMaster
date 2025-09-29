-- Rollback migration: 0000_material_mach_iv
-- This file contains the SQL to rollback the initial schema creation

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "user_achievements" CASCADE;
DROP TABLE IF EXISTS "spaced_repetition" CASCADE;
DROP TABLE IF EXISTS "friendships" CASCADE;
DROP TABLE IF EXISTS "user_sessions" CASCADE;
DROP TABLE IF EXISTS "learning_events" CASCADE;
DROP TABLE IF EXISTS "content" CASCADE;
DROP TABLE IF EXISTS "knowledge_states" CASCADE;
DROP TABLE IF EXISTS "achievements" CASCADE;
DROP TABLE IF EXISTS "concepts" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop all custom types/enums
DROP TYPE IF EXISTS "processing_status";
DROP TYPE IF EXISTS "notification_type";
DROP TYPE IF EXISTS "event_type";
DROP TYPE IF EXISTS "difficulty_level";
DROP TYPE IF EXISTS "content_category";

-- Drop any additional indexes that might have been created
-- (Most indexes are dropped automatically with tables, but listing for completeness)

-- Drop partitioned tables if they exist
DROP TABLE IF EXISTS "knowledge_states_partitioned" CASCADE;
DROP TABLE IF EXISTS "learning_events_partitioned" CASCADE;

-- Drop partition tables
DROP TABLE IF EXISTS "knowledge_states_p0" CASCADE;
DROP TABLE IF EXISTS "knowledge_states_p1" CASCADE;
DROP TABLE IF EXISTS "knowledge_states_p2" CASCADE;
DROP TABLE IF EXISTS "knowledge_states_p3" CASCADE;
DROP TABLE IF EXISTS "knowledge_states_p4" CASCADE;
DROP TABLE IF EXISTS "knowledge_states_p5" CASCADE;
DROP TABLE IF EXISTS "knowledge_states_p6" CASCADE;
DROP TABLE IF EXISTS "knowledge_states_p7" CASCADE;

DROP TABLE IF EXISTS "learning_events_2024_01" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_02" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_03" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_04" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_05" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_06" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_07" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_08" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_09" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_10" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_11" CASCADE;
DROP TABLE IF EXISTS "learning_events_2024_12" CASCADE;