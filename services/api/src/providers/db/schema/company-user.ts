// PATH: services/api/src/providers/db/schema/company-user.ts
// WHAT: Drizzle tables for company and user entities
// WHY:  Establishes tenant and operator persistence primitives
// RELEVANT: services/api/src/providers/db/schema.ts,packages/shared/src/types/company-user.ts

import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const companyTable = pgTable('company', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 100 }).notNull(),
  language: varchar('language', { length: 10 }).notNull().default('ru'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userTable = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
