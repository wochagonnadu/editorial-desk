// PATH: services/api/src/providers/db/schema/factcheck.ts
// WHAT: Drizzle tables for claims, factcheck reports, and comments
// WHY:  Persists verification outcomes and reviewer feedback
// RELEVANT: services/api/src/providers/db/schema.ts,packages/shared/src/types/factcheck.ts

import { pgTable, jsonb, numeric, text, timestamp, uuid, varchar, integer } from 'drizzle-orm/pg-core';

export const claimTable = pgTable('claim', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftVersionId: uuid('draft_version_id').notNull(),
  text: text('text').notNull(),
  claimType: varchar('claim_type', { length: 50 }).notNull(),
  riskLevel: varchar('risk_level', { length: 10 }).notNull(),
  positionStart: integer('position_start'),
  positionEnd: integer('position_end'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const factcheckReportTable = pgTable('factcheck_report', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftVersionId: uuid('draft_version_id').notNull().unique(),
  status: varchar('status', { length: 20 }).notNull(),
  results: jsonb('results').notNull().default([]),
  overallRiskScore: numeric('overall_risk_score', { precision: 3, scale: 2 }),
  disclaimerType: varchar('disclaimer_type', { length: 50 }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const commentTable = pgTable('comment', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftVersionId: uuid('draft_version_id').notNull(),
  authorType: varchar('author_type', { length: 20 }).notNull(),
  authorId: uuid('author_id').notNull(),
  text: text('text').notNull(),
  positionStart: integer('position_start'),
  positionEnd: integer('position_end'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
