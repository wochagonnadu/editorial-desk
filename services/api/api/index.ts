// PATH: services/api/api/index.ts
// WHAT: Vercel API entry point and local dev bootstrap
// WHY:  Keeps one runtime entry for serverless and local execution
// RELEVANT: services/api/src/app.ts,services/api/vercel.json

import { serve } from '@hono/node-server';
import { handle } from 'hono/vercel';
import { createApp } from '../src/app.js';

console.log('api.entry.create_app.start');
const app = createApp();
console.log('api.entry.create_app.ready');

export default handle(app);

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port });
  console.log(`API listening on http://localhost:${port}`);
}
