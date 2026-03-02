// PATH: services/api/src/providers/db/pool.ts
// WHAT: Database pool and Drizzle client factory
// WHY:  Centralizes DB connection lifecycle for API providers
// RELEVANT: services/api/src/providers/db/schema.ts,services/api/src/routes/index.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

let cached: { pool: Pool; db: Database } | null = null;

export const createDbClient = (): { pool: Pool; db: Database } => {
  if (cached) {
    return cached;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  cached = { pool, db };
  return cached;
};
