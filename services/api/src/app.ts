// PATH: services/api/src/app.ts
// WHAT: Builds the API app instance and base routes
// WHY:  Reusable app factory for local dev and Vercel runtime
// RELEVANT: services/api/api/index.ts,services/api/src/routes/index.ts,services/api/src/routes/cron.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { toErrorResponse } from './core/errors.js';
import { createDbClient } from './providers/db/index.js';
import { createEmailPort } from './providers/email.js';
import { createContentPort } from './providers/llm.js';
import { createLogger } from './providers/logger.js';
import { buildCronRoutes } from './routes/cron.js';
import { buildApiRouter } from './routes/index.js';

export const createApp = (): Hono => {
  const app = new Hono();
  const logger = createLogger();
  logger.info('app.bootstrap.start');
  const { db } = createDbClient();
  logger.info('app.bootstrap.db_ready');
  const webOrigin = process.env.APP_URL ?? 'http://localhost:5173';

  const deps = {
    db,
    email: createEmailPort(logger),
    content: createContentPort(),
    logger,
  };

  app.use('*', async (context, next) => {
    const startedAt = Date.now();
    const path = new URL(context.req.url).pathname;
    logger.info('request.start', { method: context.req.method, path });
    await next();
    logger.info('request.done', {
      method: context.req.method,
      path,
      status: context.res.status,
      duration_ms: Date.now() - startedAt,
    });
  });

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  // Local web app talks to API from a different origin (5173 -> 3000)
  app.use(
    '/api/*',
    cors({
      origin: webOrigin,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.route('/api/v1', buildApiRouter(deps));
  app.route('/api/cron', buildCronRoutes(deps));

  app.onError((error, context) => {
    logger.error('api.unhandled_error', { message: error.message });
    return toErrorResponse(context, error);
  });

  logger.info('app.bootstrap.ready', { web_origin: webOrigin });

  return app;
};
