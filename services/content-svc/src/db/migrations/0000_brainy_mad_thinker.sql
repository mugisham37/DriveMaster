DO $$ BEGIN
 CREATE TYPE "public"."content_category" AS ENUM('traffic_signs', 'road_rules', 'safety_procedures', 'situational_judgment', 'vehicle_operations', 'parking_maneuvers', 'hazard_perception');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED', 'DEPRECATED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."difficulty_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."item_type" AS ENUM('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SCENARIO', 'FILL_BLANK', 'MATCHING', 'ORDERING', 'INTERACTIVE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."media_type" AS ENUM('IMAGE', 'VIDEO', 'AUDIO', 'ANIMATION', 'SIMULATION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ab_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"hypothesis" text NOT NULL,
	"variants" jsonb NOT NULL,
	"traffic_split" jsonb NOT NULL,
	"target_concepts" jsonb DEFAULT '[]'::jsonb,
	"target_users" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'DRAFT',
	"start_date" timestamp,
	"end_date" timestamp,
	"results" jsonb DEFAULT '{}'::jsonb,
	"winner" varchar(50),
	"confidence" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(255),
	"color" varchar(7),
	"order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"parent_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "concept_prerequisites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept_id" uuid NOT NULL,
	"prerequisite_id" uuid NOT NULL,
	"weight" real DEFAULT 1,
	"is_required" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"learning_goals" jsonb DEFAULT '[]'::jsonb,
	"category_id" uuid NOT NULL,
	"difficulty" real DEFAULT 0.5,
	"estimated_time" integer,
	"order" integer DEFAULT 0,
	"status" "content_status" DEFAULT 'DRAFT',
	"is_active" boolean DEFAULT true,
	"total_items" integer DEFAULT 0,
	"avg_difficulty" real DEFAULT 0.5,
	"avg_engagement" real DEFAULT 0.5,
	"success_rate" real DEFAULT 0.5,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255),
	"updated_by" varchar(255),
	CONSTRAINT "concepts_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"period" varchar(20) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_views" integer DEFAULT 0,
	"unique_users" integer DEFAULT 0,
	"total_attempts" integer DEFAULT 0,
	"successful_attempts" integer DEFAULT 0,
	"avg_response_time" real DEFAULT 0,
	"avg_confidence" real DEFAULT 0,
	"dropoff_rate" real DEFAULT 0,
	"engagement_score" real DEFAULT 0,
	"time_spent" real DEFAULT 0,
	"completion_rate" real DEFAULT 0,
	"knowledge_gain" real DEFAULT 0,
	"retention_rate" real DEFAULT 0,
	"difficulty_rating" real DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "item_media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"concept_id" uuid NOT NULL,
	"title" varchar(255),
	"body" text NOT NULL,
	"explanation" text,
	"type" "item_type" DEFAULT 'MULTIPLE_CHOICE',
	"difficulty" real DEFAULT 0.5,
	"difficulty_level" "difficulty_level" DEFAULT 'INTERMEDIATE',
	"estimated_time" integer,
	"options" jsonb DEFAULT '{}'::jsonb,
	"correct_answer" jsonb,
	"points" integer DEFAULT 1,
	"hints" jsonb DEFAULT '[]'::jsonb,
	"feedback" jsonb DEFAULT '{}'::jsonb,
	"discrimination" real DEFAULT 1,
	"difficulty_irt" real DEFAULT 0,
	"guessing" real DEFAULT 0.2,
	"total_attempts" integer DEFAULT 0,
	"correct_attempts" integer DEFAULT 0,
	"success_rate" real DEFAULT 0,
	"avg_response_time" real DEFAULT 0,
	"engagement_score" real DEFAULT 0.5,
	"status" "content_status" DEFAULT 'DRAFT',
	"is_active" boolean DEFAULT true,
	"published_at" timestamp,
	"version" integer DEFAULT 1,
	"parent_item_id" uuid,
	"ab_test_variant" varchar(50),
	"ab_test_weight" real DEFAULT 1,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar(255),
	"updated_by" varchar(255),
	CONSTRAINT "items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"duration" integer,
	"storage_url" varchar(500) NOT NULL,
	"cdn_url" varchar(500),
	"thumbnail" varchar(500),
	"type" "media_type" NOT NULL,
	"alt" text,
	"caption" text,
	"usage_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"uploaded_by" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "search_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"title" varchar(255),
	"content" text NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"boost" real DEFAULT 1,
	"quality" real DEFAULT 0.5,
	"popularity" real DEFAULT 0.5,
	"is_indexed" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "concept_prerequisites" ADD CONSTRAINT "concept_prerequisites_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "concept_prerequisites" ADD CONSTRAINT "concept_prerequisites_prerequisite_id_concepts_id_fk" FOREIGN KEY ("prerequisite_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "concepts" ADD CONSTRAINT "concepts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_media_assets" ADD CONSTRAINT "item_media_assets_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "item_media_assets" ADD CONSTRAINT "item_media_assets_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items" ADD CONSTRAINT "items_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_name_idx" ON "ab_tests" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_status_idx" ON "ab_tests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_start_date_idx" ON "ab_tests" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_end_date_idx" ON "ab_tests" USING btree ("end_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_key_idx" ON "categories" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_order_idx" ON "categories" USING btree ("order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_active_idx" ON "categories" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "concept_prerequisites_concept_prereq_idx" ON "concept_prerequisites" USING btree ("concept_id","prerequisite_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concept_prerequisites_concept_idx" ON "concept_prerequisites" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concept_prerequisites_prerequisite_idx" ON "concept_prerequisites" USING btree ("prerequisite_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "concepts_key_idx" ON "concepts" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_category_idx" ON "concepts" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_difficulty_idx" ON "concepts" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_status_idx" ON "concepts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_active_idx" ON "concepts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_order_idx" ON "concepts" USING btree ("order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "concepts_success_rate_idx" ON "concepts" USING btree ("success_rate");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_analytics_entity_period_idx" ON "content_analytics" USING btree ("entity_type","entity_id","period","period_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_analytics_entity_idx" ON "content_analytics" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_analytics_period_idx" ON "content_analytics" USING btree ("period");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_analytics_period_start_idx" ON "content_analytics" USING btree ("period_start");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "item_media_assets_item_media_idx" ON "item_media_assets" USING btree ("item_id","media_asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_media_assets_item_idx" ON "item_media_assets" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "item_media_assets_media_idx" ON "item_media_assets" USING btree ("media_asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "items_slug_idx" ON "items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_concept_idx" ON "items" USING btree ("concept_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_type_idx" ON "items" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_difficulty_idx" ON "items" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_status_idx" ON "items" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_active_idx" ON "items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_success_rate_idx" ON "items" USING btree ("success_rate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_engagement_idx" ON "items" USING btree ("engagement_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_published_idx" ON "items" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_ab_test_idx" ON "items" USING btree ("ab_test_variant");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "items_parent_item_idx" ON "items" USING btree ("parent_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_filename_idx" ON "media_assets" USING btree ("filename");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_type_idx" ON "media_assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_mime_type_idx" ON "media_assets" USING btree ("mime_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_active_idx" ON "media_assets" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_usage_idx" ON "media_assets" USING btree ("usage_count");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "search_index_entity_idx" ON "search_index" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_index_indexed_idx" ON "search_index" USING btree ("is_indexed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_index_quality_idx" ON "search_index" USING btree ("quality");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_index_popularity_idx" ON "search_index" USING btree ("popularity");