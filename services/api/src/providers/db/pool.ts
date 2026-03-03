// PATH: services/api/src/providers/db/pool.ts
// WHAT: Database pool and Drizzle client factory
// WHY:  Centralizes DB connection lifecycle for API providers
// RELEVANT: services/api/src/providers/db/schema.ts,services/api/src/routes/index.ts,services/api/src/app.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

let cached: { pool: Pool; db: Database } | null = null;

const readInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const createDbClient = (): { pool: Pool; db: Database } => {
  if (cached) {
    return cached;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString,
    // Fail fast in serverless to avoid platform-level 504 (no CORS headers).
    connectionTimeoutMillis: readInt(process.env.DB_CONNECT_TIMEOUT_MS, 4_000),
    query_timeout: readInt(process.env.DB_QUERY_TIMEOUT_MS, 8_000),
    idleTimeoutMillis: readInt(process.env.DB_IDLE_TIMEOUT_MS, 10_000),
    max: readInt(process.env.DB_POOL_MAX, 3),
  });
  const db = drizzle(pool, { schema });
  cached = { pool, db };
  return cached;
};
