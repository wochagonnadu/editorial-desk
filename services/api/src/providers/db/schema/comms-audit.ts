// PATH: services/api/src/providers/db/schema/comms-audit.ts
// WHAT: Drizzle tables for notifications and audit logs
// WHY:  Stores email tracking and append-only action history
// RELEVANT: services/api/src/providers/db/schema.ts,packages/shared/src/types/audit.ts

import { pgTable, boolean, jsonb, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const notificationTable = pgTable('notification', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  notificationType: varchar('notification_type', { length: 50 }).notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  emailToken: varchar('email_token', { length: 255 }).notNull().unique(),
  magicLinkToken: varchar('magic_link_token', { length: 255 }).unique(),
  magicLinkExpiresAt: timestamp('magic_link_expires_at', { withTimezone: true }),
  magicLinkRevoked: boolean('magic_link_revoked').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('queued'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogTable = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  actorType: varchar('actor_type', { length: 20 }).notNull(),
  actorId: uuid('actor_id'),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  draftVersionId: uuid('draft_version_id'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
