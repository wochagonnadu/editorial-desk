// PATH: services/api/src/app.ts
// WHAT: Builds the API app instance and base routes
// WHY:  Reusable app factory for local dev and Vercel runtime
// RELEVANT: services/api/api/index.ts,services/api/src/routes/index.ts,services/api/src/routes/cron.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { toErrorResponse } from './core/errors';
import { createDbClient } from './providers/db';
import { createEmailPort } from './providers/email';
import { createContentPort } from './providers/llm';
import { createLogger } from './providers/logger';
import { buildCronRoutes } from './routes/cron';
import { buildApiRouter } from './routes';

export const createApp = (): Hono => {
  const app = new Hono();
  const logger = createLogger();
  const { db } = createDbClient();
  const webOrigin = process.env.APP_URL ?? 'http://localhost:5173';

  const deps = {
    db,
    email: createEmailPort(logger),
    content: createContentPort(),
    logger,
  };

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

  return app;
};
