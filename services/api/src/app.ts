// PATH: services/api/src/app.ts
// WHAT: Builds the API app instance and base routes
// WHY:  Reusable app factory for local dev and Vercel runtime
// RELEVANT: services/api/api/index.ts,services/api/src/routes/index.ts,services/api/src/routes/cron.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { toErrorResponse } from './core/errors.js';
import { createDbClient, describeDatabaseTarget } from './providers/db/index.js';
import { createEmailPort } from './providers/email.js';
import { createContentPort } from './providers/llm.js';
import { createLogger } from './providers/logger.js';
import { createWorkerRuntime } from './worker/bootstrap.js';
import { buildCronRoutes } from './routes/cron.js';
import { buildApiRouter } from './routes/index.js';

const isVercelPreviewOrigin = (origin: string): boolean => {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

const createCorsOriginResolver =
  (webOrigin: string) =>
  (origin: string): string => {
    if (!origin) return webOrigin;
    if (origin === webOrigin) return origin;
    if (origin === 'http://localhost:5173') return origin;
    if (isVercelPreviewOrigin(origin)) return origin;
    return webOrigin;
  };

export const createApp = (): Hono => {
  const app = new Hono();
  const logger = createLogger();
  logger.info('app.bootstrap.start');
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    logger.info('app.bootstrap.db_target', { ...describeDatabaseTarget(connectionString) });
  }
  const { db } = createDbClient();
  logger.info('app.bootstrap.db_ready');
  const webOrigin = process.env.APP_URL ?? 'http://localhost:5173';

  const baseDeps = {
    db,
    email: createEmailPort(logger),
    content: createContentPort(),
    logger,
  };
  const deps = { ...baseDeps, worker: createWorkerRuntime(baseDeps) };

  app.use('*', async (context, next) => {
    const startedAt = Date.now();
    const path = context.req.path || 'unknown';
    logger.info('request.start', { method: context.req.method, path, url: context.req.url });
    try {
      await next();
    } finally {
      logger.info('request.done', {
        method: context.req.method,
        path,
        status: context.res.status,
        duration_ms: Date.now() - startedAt,
      });
    }
  });

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  // Vercel can forward requests as /api/* or stripped /v1/* paths.
  // CORS must cover both, otherwise preflight can return 404.
  const corsOptions = {
    origin: createCorsOriginResolver(webOrigin),
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Auth-Email'],
  };
  app.use('/api/*', cors(corsOptions));
  app.use('/v1/*', cors(corsOptions));

  // Vercel can pass either /api/* or stripped /* paths depending on route matching.
  // Register both prefixes to keep behavior stable across environments.
  app.route('/api/v1', buildApiRouter(deps));
  app.route('/v1', buildApiRouter(deps));
  app.route('/api/cron', buildCronRoutes(deps));
  app.route('/cron', buildCronRoutes(deps));

  app.onError((error, context) => {
    const isError = error instanceof Error;
    const cause =
      isError && error.cause instanceof Error
        ? error.cause.message
        : isError && typeof error.cause === 'string'
          ? error.cause
          : undefined;
    logger.error('api.unhandled_error', {
      event: 'api.unhandled_error',
      name: isError ? error.name : 'UnknownError',
      error_message: isError ? error.message : String(error),
      cause,
    });
    return toErrorResponse(context, error);
  });

  logger.info('app.bootstrap.ready', { web_origin: webOrigin });

  return app;
};
