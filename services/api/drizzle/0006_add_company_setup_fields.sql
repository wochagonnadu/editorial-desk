-- PATH: services/api/drizzle/0006_add_company_setup_fields.sql
-- WHAT: Adds company editorial context and setup completion marker
-- WHY:  Unblocks first-run manager setup flow and shared Settings source of truth
-- RELEVANT: services/api/src/providers/db/schema/company-user.ts,services/api/src/routes/companies.ts,apps/web/src/pages/ManagerSetup.tsx

ALTER TABLE "company"
ADD COLUMN "description" text NOT NULL DEFAULT '',
ADD COLUMN "setup_completed_at" timestamp with time zone;
