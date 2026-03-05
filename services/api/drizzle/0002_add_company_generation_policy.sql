-- PATH: services/api/drizzle/0002_add_company_generation_policy.sql
-- WHAT: Adds workspace generation_policy JSONB to company table
-- WHY:  Persists tenant-level tone/guardrails defaults for LLM generation behavior
-- RELEVANT: services/api/src/providers/db/schema/company-user.ts,services/api/src/routes/companies.ts

ALTER TABLE "company"
ADD COLUMN "generation_policy" jsonb DEFAULT '{}'::jsonb NOT NULL;
