-- PATH: services/api/drizzle/0004_add_expert_manager_user.sql
-- WHAT: Adds manager_user_id to expert for sender attribution
-- WHY:  Keeps expert-facing email sender tied to the manager who started the workflow
-- RELEVANT: services/api/src/providers/db/schema/expert-voice.ts,services/api/src/core/onboarding.ts,services/api/src/routes/experts.ts

ALTER TABLE "expert" ADD COLUMN "manager_user_id" uuid;
