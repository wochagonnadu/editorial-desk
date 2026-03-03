// PATH: services/api/tests/unit/with-db-timeout.test.ts
// WHAT: Verifies DB timeout wrapper fails fast with deterministic AppError
// WHY:  Prevents platform-level 504 when DB operations hang
// RELEVANT: services/api/src/core/db/with-db-timeout.ts,services/api/src/routes/auth.ts,services/api/src/routes/debug.ts

import { AppError } from '../../src/core/errors';
import { withDbTimeout } from '../../src/core/db/with-db-timeout';

describe('withDbTimeout', () => {
  it('returns resolved value when operation completes before timeout', async () => {
    await expect(withDbTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });

  it('throws DB_TIMEOUT when operation hangs', async () => {
    const never = new Promise<never>(() => undefined);
    await expect(withDbTimeout(never, 5)).rejects.toMatchObject({
      status: 503,
      code: 'DB_TIMEOUT',
    } satisfies Pick<AppError, 'status' | 'code'>);
  });
});
