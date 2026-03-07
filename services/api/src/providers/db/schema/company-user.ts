// PATH: services/api/src/providers/db/schema/company-user.ts
// WHAT: Drizzle tables for company and user entities
// WHY:  Establishes tenant, operator, and first-run setup persistence primitives
// RELEVANT: services/api/src/providers/db/schema.ts,packages/shared/src/types/company-user.ts,services/api/src/routes/companies.ts

import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const companyTable = pgTable('company', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 100 }).notNull(),
  description: text('description').notNull().default(''),
  language: varchar('language', { length: 10 }).notNull().default('ru'),
  generationPolicy: jsonb('generation_policy').notNull().default({}),
  setupCompletedAt: timestamp('setup_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userTable = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  onboardingStatus: varchar('onboarding_status', { length: 30 }).notNull().default('not_started'),
  onboardingCurrentStep: varchar('onboarding_current_step', { length: 50 }),
  onboardingStartedAt: timestamp('onboarding_started_at', { withTimezone: true }),
  onboardingSkippedAt: timestamp('onboarding_skipped_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
