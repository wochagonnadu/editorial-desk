// PATH: services/api/src/app.ts
// WHAT: Builds the API app instance and base routes
// WHY:  Reusable app factory for local dev and Vercel runtime
// RELEVANT: services/api/api/index.ts,services/api/package.json

import { Hono } from 'hono';

export const createApp = (): Hono => {
  const app = new Hono();

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  return app;
};
