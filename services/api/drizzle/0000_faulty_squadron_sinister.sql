-- PATH: services/api/drizzle/0000_faulty_squadron_sinister.sql
-- WHAT: Initial Drizzle migration creating 16 MVP domain tables
-- WHY:  Bootstraps Supabase schema required by API repositories and routes
-- RELEVANT: services/api/src/providers/db/schema.ts,services/api/drizzle.config.ts

CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint

CREATE TABLE "company" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(100) NOT NULL,
	"language" varchar(10) DEFAULT 'ru' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "expert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"role_title" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"domain" varchar(100) NOT NULL,
	"public_text_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_sequence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expert_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"response_data" jsonb,
	"reminder_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expert_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"profile_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"public_texts_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"voice_test_feedback" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_profile_expert_id_unique" UNIQUE("expert_id")
);
--> statement-breakpoint
CREATE TABLE "draft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"expert_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"current_version_id" uuid,
	"status" varchar(20) DEFAULT 'drafting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "draft_topic_id_unique" UNIQUE("topic_id")
);
--> statement-breakpoint
CREATE TABLE "draft_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"voice_score" numeric(3, 2),
	"diff_from_previous" jsonb,
	"created_by" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topic" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"expert_id" uuid,
	"title" varchar(500) NOT NULL,
	"description" text,
	"source_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'proposed' NOT NULL,
	"proposed_by" varchar(20) DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_version_id" uuid NOT NULL,
	"text" text NOT NULL,
	"claim_type" varchar(50) NOT NULL,
	"risk_level" varchar(10) NOT NULL,
	"position_start" integer,
	"position_end" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_version_id" uuid NOT NULL,
	"author_type" varchar(20) NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"position_start" integer,
	"position_end" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "factcheck_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_version_id" uuid NOT NULL,
	"status" varchar(20) NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overall_risk_score" numeric(3, 2),
	"disclaimer_type" varchar(50),
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "factcheck_report_draft_version_id_unique" UNIQUE("draft_version_id")
);
--> statement-breakpoint
CREATE TABLE "approval_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_step_id" uuid NOT NULL,
	"draft_version_id" uuid NOT NULL,
	"decision" varchar(20) NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_flow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"flow_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"deadline_hours" integer DEFAULT 48 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approval_flow_draft_id_unique" UNIQUE("draft_id")
);
--> statement-breakpoint
CREATE TABLE "approval_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_flow_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"approver_type" varchar(20) NOT NULL,
	"approver_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"deadline_at" timestamp with time zone,
	"reminder_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"draft_version_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"email_token" varchar(255) NOT NULL,
	"magic_link_token" varchar(255),
	"magic_link_expires_at" timestamp with time zone,
	"magic_link_revoked" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_email_token_unique" UNIQUE("email_token"),
	CONSTRAINT "notification_magic_link_token_unique" UNIQUE("magic_link_token")
);
