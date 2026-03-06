-- PATH: services/api/drizzle/0005_add_user_onboarding_state.sql
-- WHAT: Adds first-run onboarding state columns to user
-- WHY:  Keeps manager onboarding routing and resume on the server instead of browser-only state
-- RELEVANT: services/api/src/providers/db/schema/company-user.ts,services/api/src/routes/users.ts,apps/web/src/services/onboarding.ts

ALTER TABLE "user"
ADD COLUMN "onboarding_status" varchar(30) NOT NULL DEFAULT 'not_started',
ADD COLUMN "onboarding_current_step" varchar(50),
ADD COLUMN "onboarding_started_at" timestamp with time zone,
ADD COLUMN "onboarding_skipped_at" timestamp with time zone,
ADD COLUMN "onboarding_completed_at" timestamp with time zone;
