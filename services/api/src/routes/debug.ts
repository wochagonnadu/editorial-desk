// PATH: services/api/src/routes/debug.ts
// WHAT: Temporary debug routes for production connectivity diagnostics
// WHY:  Helps quickly isolate Vercel runtime issues without exposing secrets
// RELEVANT: services/api/src/routes/index.ts,services/api/src/routes/deps.ts,services/api/src/providers/db/pool.ts

import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { AppError } from '../core/errors.js';
import type { RouteDeps } from './deps.js';

const ensureDebugSecret = (headerValue: string | undefined): void => {
  const secret = process.env.CRON_SECRET;
  if (!secret || !headerValue || headerValue !== secret) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid debug secret');
  }
};

export const buildDebugRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.get('/db-ping', async (context) => {
    ensureDebugSecret(context.req.header('x-cron-secret'));
    const startedAt = Date.now();
    try {
      await deps.db.execute(sql`select 1`);
      return context.json({
        ok: true,
        duration_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      deps.logger.error('debug.db_ping_failed', {
        duration_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      throw new AppError(502, 'DB_UNAVAILABLE', 'Database ping failed');
    }
  });

  return router;
};
