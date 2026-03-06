// PATH: services/api/src/providers/db/schema/expert-voice.ts
// WHAT: Drizzle tables for experts, voice profiles, and onboarding
// WHY:  Persists expert onboarding and voice fidelity data
// RELEVANT: services/api/src/providers/db/schema.ts,packages/shared/src/types/expert.ts

import { pgTable, integer, jsonb, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const expertTable = pgTable('expert', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  managerUserId: uuid('manager_user_id'),
  name: varchar('name', { length: 255 }).notNull(),
  roleTitle: varchar('role_title', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 100 }).notNull(),
  publicTextUrls: jsonb('public_text_urls').notNull().default([]),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const voiceProfileTable = pgTable('voice_profile', {
  id: uuid('id').defaultRandom().primaryKey(),
  expertId: uuid('expert_id').notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  profileData: jsonb('profile_data').notNull().default({}),
  publicTextsData: jsonb('public_texts_data').notNull().default({}),
  voiceTestFeedback: jsonb('voice_test_feedback').notNull().default([]),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const onboardingSequenceTable = pgTable('onboarding_sequence', {
  id: uuid('id').defaultRandom().primaryKey(),
  expertId: uuid('expert_id').notNull(),
  stepNumber: integer('step_number').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  responseData: jsonb('response_data'),
  reminderCount: integer('reminder_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
