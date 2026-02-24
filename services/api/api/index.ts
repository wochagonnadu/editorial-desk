// PATH: services/api/api/index.ts
// WHAT: Vercel API entry point and local dev bootstrap
// WHY:  Keeps one runtime entry for serverless and local execution
// RELEVANT: services/api/src/app.ts,services/api/vercel.json

import { serve } from '@hono/node-server';
import { handle } from 'hono/vercel';
import { createApp } from '../src/app';

const app = createApp();

export default handle(app);

if (process.env.NODE_ENV !== 'production') {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port });
  console.log(`API listening on http://localhost:${port}`);
}
