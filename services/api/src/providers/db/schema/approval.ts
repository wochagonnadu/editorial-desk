// PATH: services/api/src/providers/db/schema/approval.ts
// WHAT: Drizzle tables for approval flow, steps, and decisions
// WHY:  Supports version-bound approval workflow persistence
// RELEVANT: services/api/src/providers/db/schema.ts,packages/shared/src/types/approval.ts

import { pgTable, integer, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const approvalFlowTable = pgTable('approval_flow', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftId: uuid('draft_id').notNull().unique(),
  flowType: varchar('flow_type', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  deadlineHours: integer('deadline_hours').notNull().default(48),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const approvalStepTable = pgTable('approval_step', {
  id: uuid('id').defaultRandom().primaryKey(),
  approvalFlowId: uuid('approval_flow_id').notNull(),
  stepOrder: integer('step_order').notNull(),
  approverType: varchar('approver_type', { length: 20 }).notNull(),
  approverId: uuid('approver_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('waiting'),
  deadlineAt: timestamp('deadline_at', { withTimezone: true }),
  reminderCount: integer('reminder_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const approvalDecisionTable = pgTable('approval_decision', {
  id: uuid('id').defaultRandom().primaryKey(),
  approvalStepId: uuid('approval_step_id').notNull(),
  draftVersionId: uuid('draft_version_id').notNull(),
  decision: varchar('decision', { length: 20 }).notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
