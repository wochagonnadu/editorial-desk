-- PATH: services/api/drizzle/0003_track_company_generation_policy.sql
-- WHAT: Backfills and hardens company generation_policy as a tracked migration
-- WHY:  Repairs migration drift so db:migrate applies the missing company policy column safely
-- RELEVANT: services/api/drizzle/0002_add_company_generation_policy.sql,services/api/src/providers/db/schema/company-user.ts

ALTER TABLE "company"
ADD COLUMN IF NOT EXISTS "generation_policy" jsonb;

ALTER TABLE "company"
ALTER COLUMN "generation_policy" SET DEFAULT '{}'::jsonb;

UPDATE "company"
SET "generation_policy" = '{}'::jsonb
WHERE "generation_policy" IS NULL;

ALTER TABLE "company"
ALTER COLUMN "generation_policy" SET NOT NULL;
