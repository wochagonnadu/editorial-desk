// PATH: services/api/src/app.ts
// WHAT: Builds the API app instance and base routes
// WHY:  Reusable app factory for local dev and Vercel runtime
// RELEVANT: services/api/api/index.ts,services/api/src/routes/index.ts,services/api/src/providers/db/pool.ts

import { Hono } from 'hono';
import { toErrorResponse } from './core/errors';
import { createDbClient } from './providers/db';
import { createEmailPort } from './providers/email';
import { createContentPort } from './providers/llm';
import { createLogger } from './providers/logger';
import { buildApiRouter } from './routes';

export const createApp = (): Hono => {
  const app = new Hono();
  const logger = createLogger();
  const { db } = createDbClient();

  const deps = {
    db,
    email: createEmailPort(logger),
    content: createContentPort(),
    logger,
  };

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  app.route('/api/v1', buildApiRouter(deps));

  app.onError((error, context) => {
    logger.error('api.unhandled_error', { message: error.message });
    return toErrorResponse(context, error);
  });

  return app;
};
