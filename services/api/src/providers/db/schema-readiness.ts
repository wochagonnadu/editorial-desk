// PATH: services/api/src/providers/db/schema-readiness.ts
// WHAT: Checks required DB columns before runtime routes touch drifted tables
// WHY:  Fails fast with explicit schema mismatch instead of route-specific SQL crashes
// RELEVANT: services/api/src/app.ts,services/api/src/providers/db/pool.ts,services/api/drizzle/0003_track_company_generation_policy.sql

import { sql } from 'drizzle-orm';
import { withDbTimeout } from '../../core/db/with-db-timeout.js';
import { AppError } from '../../core/errors.js';
import type { Logger } from '../logger.js';
import type { Database } from './pool.js';

const REQUIRED_COLUMNS = [{ table: 'company', column: 'generation_policy' }] as const;

let schemaReadyPromise: Promise<void> | null = null;

const readRows = (result: unknown): Array<{ table_name?: string; column_name?: string }> => {
  if (Array.isArray(result)) return result as Array<{ table_name?: string; column_name?: string }>;
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) {
    return result.rows as Array<{ table_name?: string; column_name?: string }>;
  }
  return [];
};

const loadPresentColumns = async (db: Database): Promise<string[]> => {
  const result = await withDbTimeout(db.execute(sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'company' and column_name = 'generation_policy')
      )
  `));
  return readRows(result).map((row) => `${row.table_name ?? ''}.${row.column_name ?? ''}`);
};

export const resetSchemaReadinessCache = (): void => {
  schemaReadyPromise = null;
};

export const assertRequiredColumnsPresent = async (db: Database, logger: Logger): Promise<void> => {
  const presentColumns = await loadPresentColumns(db);
  const missing = REQUIRED_COLUMNS.map(({ table, column }) => `${table}.${column}`).filter(
    (name) => !presentColumns.includes(name),
  );
  if (missing.length === 0) return;

  logger.error('db.schema_mismatch', {
    missing_columns: missing,
    migration_hint: 'pnpm --filter @newsroom/api db:migrate',
  });
  throw new AppError(503, 'DB_SCHEMA_MISMATCH', 'Database schema is behind required migrations', {
    missing_columns: missing,
  });
};

export const ensureSchemaReadiness = async (db: Database, logger: Logger): Promise<void> => {
  if (process.env.NODE_ENV === 'test') return;
  if (schemaReadyPromise) return schemaReadyPromise;

  schemaReadyPromise = assertRequiredColumnsPresent(db, logger).catch((error) => {
    schemaReadyPromise = null;
    throw error;
  });

  return schemaReadyPromise;
};
