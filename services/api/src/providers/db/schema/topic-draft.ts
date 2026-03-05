// PATH: services/api/src/providers/db/schema/topic-draft.ts
// WHAT: Drizzle tables for topics, drafts, and draft versions
// WHY:  Stores editorial planning and immutable draft history
// RELEVANT: services/api/src/providers/db/schema.ts,packages/shared/src/types/topic-draft.ts

import {
  pgTable,
  integer,
  jsonb,
  numeric,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const topicTable = pgTable('topic', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  expertId: uuid('expert_id'),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  sourceType: varchar('source_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('proposed'),
  proposedBy: varchar('proposed_by', { length: 20 }).notNull().default('system'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const draftTable = pgTable('draft', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').notNull().unique(),
  expertId: uuid('expert_id').notNull(),
  companyId: uuid('company_id').notNull(),
  currentVersionId: uuid('current_version_id'),
  status: varchar('status', { length: 20 }).notNull().default('drafting'),
  scheduledPublishAt: timestamp('scheduled_publish_at', { withTimezone: true }),
  publishTimezone: varchar('publish_timezone', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const draftVersionTable = pgTable('draft_version', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftId: uuid('draft_id').notNull(),
  versionNumber: integer('version_number').notNull(),
  content: text('content').notNull(),
  summary: text('summary'),
  voiceScore: numeric('voice_score', { precision: 3, scale: 2 }),
  diffFromPrevious: jsonb('diff_from_previous'),
  createdBy: varchar('created_by', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
