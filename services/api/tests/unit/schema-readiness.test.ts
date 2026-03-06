// PATH: services/api/tests/unit/schema-readiness.test.ts
// WHAT: Unit tests for required DB schema readiness guard
// WHY:  Prevents silent schema drift from reaching runtime auth and company routes
// RELEVANT: services/api/src/providers/db/schema-readiness.ts,services/api/src/app.ts,services/api/drizzle/0003_track_company_generation_policy.sql

import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import {
  assertRequiredColumnsPresent,
  ensureSchemaReadiness,
  resetSchemaReadinessCache,
} from '../../src/providers/db/schema-readiness';

type DbStub = {
  execute: ReturnType<typeof vi.fn>;
};

const createDb = (rows: unknown[]): DbStub => ({
  execute: vi.fn(async () => ({ rows })),
});

const asDatabase = <T>(db: T): Parameters<typeof assertRequiredColumnsPresent>[0] =>
  db as unknown as Parameters<typeof assertRequiredColumnsPresent>[0];

describe('schema readiness', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    resetSchemaReadinessCache();
    vi.restoreAllMocks();
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('passes when required company column exists', async () => {
    const db = createDb([{ table_name: 'company', column_name: 'generation_policy' }]);

    await expect(assertRequiredColumnsPresent(asDatabase(db), createLogger())).resolves.toBeUndefined();
  });

  it('fails with DB_SCHEMA_MISMATCH when company column is missing', async () => {
    const db = createDb([]);
    const logger = createLogger();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(assertRequiredColumnsPresent(asDatabase(db), logger)).rejects.toMatchObject({
      code: 'DB_SCHEMA_MISMATCH',
      status: 503,
      details: { missing_columns: ['company.generation_policy'] },
    } satisfies Pick<AppError, 'code' | 'status' | 'details'>);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('memoizes successful readiness checks outside test env', async () => {
    process.env.NODE_ENV = 'development';
    const db = createDb([{ table_name: 'company', column_name: 'generation_policy' }]);

    await ensureSchemaReadiness(asDatabase(db), createLogger());
    await ensureSchemaReadiness(asDatabase(db), createLogger());

    expect(db.execute).toHaveBeenCalledTimes(1);
  });
});
