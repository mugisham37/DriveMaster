DO $$ BEGIN
 CREATE TYPE "content_category" AS ENUM('traffic_signs', 'road_rules', 'safety_procedures', 'situational_judgment', 'vehicle_operations', 'parking_maneuvers', 'hazard_perception');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "difficulty_level" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "event_type" AS ENUM('question_answered', 'session_started', 'session_ended', 'concept_mastered', 'achievement_unlocked', 'streak_updated', 'review_scheduled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "notification_type" AS ENUM('reminder', 'achievement', 'social', 'system', 'marketing');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"xp_reward" integer DEFAULT 0,
	"badge_icon" varchar(255),
	"requirements" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "achievements_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "content_category" NOT NULL,
	"parent_concept_id" uuid,
	"prerequisites" jsonb DEFAULT '[]'::jsonb,
	"base_difficulty" real DEFAULT 0.5 NOT NULL,
	"estimated_learning_time" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "concepts_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"category" "content_category" NOT NULL,
	"difficulty" real DEFAULT 0 NOT NULL,
	"discrimination" real DEFAULT 1 NOT NULL,
	"guess_parameter" real DEFAULT 0.25 NOT NULL,
	"version" integer DEFAULT 1,
	"parent_content_id" uuid,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb,
	"total_attempts" integer DEFAULT 0,
	"correct_attempts" integer DEFAULT 0,
	"average_response_time" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"initial_knowledge" real DEFAULT 0.1 NOT NULL,
	"learning_rate" real DEFAULT 0.3 NOT NULL,
	"guess_parameter" real DEFAULT 0.25 NOT NULL,
	"slip_parameter" real DEFAULT 0.1 NOT NULL,
	"mastery_probability" real DEFAULT 0.1 NOT NULL,
	"temporal_decay" real DEFAULT 0.95,
	"last_interaction" timestamp,
	"interaction_count" integer DEFAULT 0,
	"correct_count" integer DEFAULT 0,
	"personal_learning_velocity" real DEFAULT 1,
	"confidence_level" real DEFAULT 0.5,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"event_type" "event_type" NOT NULL,
	"concept_id" uuid,
	"content_id" uuid,
	"response_data" jsonb,
	"context_data" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"processing_status" "processing_status" DEFAULT 'pending',
	"processed_at" timestamp,
	"session_position" integer,
	"cumulative_time" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"read_at" timestamp,
	"is_read" boolean DEFAULT false,
	"delivery_status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spaced_repetition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"repetition" integer DEFAULT 0 NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL,
	"next_review" timestamp NOT NULL,
	"last_review" timestamp,
	"quality" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"progress" real DEFAULT 0,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"questions_attempted" integer DEFAULT 0,
	"questions_correct" integer DEFAULT 0,
	"xp_earned" integer DEFAULT 0,
	"concepts_studied" jsonb DEFAULT '[]'::jsonb,
	"device_info" jsonb,
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"date_of_birth" timestamp,
	"cognitive_patterns" jsonb,
	"learning_preferences" jsonb,
	"total_xp" integer DEFAULT 0,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_active_at" timestamp,
	"is_active" boolean DEFAULT true,
	"email_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "achievements_key_idx" ON "achievements" ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "achievements_category_idx" ON "achievements" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "achievements_active_idx" ON "achievements" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "concepts_key_idx" ON "concepts" ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_category_idx" ON "concepts" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_parent_idx" ON "concepts" ("parent_concept_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_difficulty_idx" ON "concepts" ("base_difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_active_idx" ON "concepts" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_prerequisites_idx" ON "concepts" ("prerequisites");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_concept_idx" ON "content" ("concept_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_category_difficulty_idx" ON "content" ("category","difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_active_idx" ON "content" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_version_idx" ON "content" ("parent_content_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_performance_idx" ON "content" ("total_attempts","correct_attempts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_metadata_idx" ON "content" ("metadata");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_requester_addressee_idx" ON "friendships" ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_addressee_requester_idx" ON "friendships" ("addressee_id","requester_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_status_idx" ON "friendships" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_states_user_concept_idx" ON "knowledge_states" ("user_id","concept_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_states_mastery_idx" ON "knowledge_states" ("mastery_probability");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_states_user_mastery_idx" ON "knowledge_states" ("user_id","mastery_probability");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_states_last_interaction_idx" ON "knowledge_states" ("last_interaction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_states_concept_mastery_idx" ON "knowledge_states" ("concept_id","mastery_probability");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_user_timestamp_idx" ON "learning_events" ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_session_idx" ON "learning_events" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_event_type_idx" ON "learning_events" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_processing_idx" ON "learning_events" ("processing_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_concept_event_idx" ON "learning_events" ("concept_id","event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_timestamp_partition_idx" ON "learning_events" ("timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_response_data_idx" ON "learning_events" ("response_data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_events_context_data_idx" ON "learning_events" ("context_data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_idx" ON "notifications" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_scheduled_idx" ON "notifications" ("scheduled_for");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("user_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_delivery_status_idx" ON "notifications" ("delivery_status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spaced_repetition_user_concept_idx" ON "spaced_repetition" ("user_id","concept_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spaced_repetition_next_review_idx" ON "spaced_repetition" ("next_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spaced_repetition_user_next_review_idx" ON "spaced_repetition" ("user_id","next_review");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spaced_repetition_active_idx" ON "spaced_repetition" ("is_active","next_review");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_achievements_user_achievement_idx" ON "user_achievements" ("user_id","achievement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_user_completed_idx" ON "user_achievements" ("user_id","is_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_completed_at_idx" ON "user_achievements" ("completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_idx" ON "user_sessions" ("user_id","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_session_id_idx" ON "user_sessions" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_completed_idx" ON "user_sessions" ("is_completed","end_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_performance_idx" ON "user_sessions" ("questions_attempted","questions_correct");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_cognitive_idx" ON "users" ("cognitive_patterns");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_preferences_idx" ON "users" ("learning_preferences");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_active_idx" ON "users" ("is_active","last_active_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_xp_idx" ON "users" ("total_xp");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content" ADD CONSTRAINT "content_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_states" ADD CONSTRAINT "knowledge_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_states" ADD CONSTRAINT "knowledge_states_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spaced_repetition" ADD CONSTRAINT "spaced_repetition_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spaced_repetition" ADD CONSTRAINT "spaced_repetition_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "concepts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
