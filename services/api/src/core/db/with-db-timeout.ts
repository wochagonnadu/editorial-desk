// PATH: services/api/src/core/db/with-db-timeout.ts
// WHAT: DB operation timeout guard with deterministic API error
// WHY:  Prevents Vercel 25s platform timeout when DB hangs
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/debug.ts,.env.example

import { AppError } from '../errors.js';

const DEFAULT_DB_OPERATION_TIMEOUT_MS = 4_000;

const readInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const getDbOperationTimeoutMs = (): number =>
  readInt(process.env.DB_OPERATION_TIMEOUT_MS, DEFAULT_DB_OPERATION_TIMEOUT_MS);

export const withDbTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs = getDbOperationTimeoutMs(),
): Promise<T> => {
  let timer: NodeJS.Timeout | null = null;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new AppError(503, 'DB_TIMEOUT', 'Database operation timed out')),
        timeoutMs,
      );
    });
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};
