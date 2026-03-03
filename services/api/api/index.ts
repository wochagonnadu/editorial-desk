// PATH: services/api/api/index.ts
// WHAT: Vercel API entry point and local dev bootstrap
// WHY:  Keeps one runtime entry for serverless and local execution
// RELEVANT: services/api/src/app.ts,services/api/vercel.json

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Http2ServerRequest, Http2ServerResponse } from 'node:http2';
import { serve } from '@hono/node-server';
import { handle } from '@hono/node-server/vercel';
import { createApp } from '../src/app.js';

console.log('api.entry.create_app.start');
const app = createApp();
console.log('api.entry.create_app.ready');

type Incoming = IncomingMessage | Http2ServerRequest;
type Outgoing = ServerResponse | Http2ServerResponse;

const logVercelRequestShape = (incoming: Incoming): void => {
  const raw = incoming as Incoming & {
    headers?: unknown;
    rawHeaders?: unknown;
    method?: string;
    url?: string;
  };
  const headers = raw.headers as { get?: unknown } | undefined;
  console.log('api.entry.request_shape', {
    has_headers_get: typeof headers?.get === 'function',
    headers_type: raw.headers ? typeof raw.headers : 'undefined',
    has_raw_headers: Array.isArray(raw.rawHeaders),
    method: raw.method ?? 'unknown',
    url: raw.url ?? 'unknown',
  });
};

const vercelHandler = handle(app);

// TODO(incident-2026-03-03): remove request-shape diagnostics after 24h stable production logs.
export default async (incoming: Incoming, outgoing: Outgoing): Promise<void> => {
  if (process.env.VERCEL === '1') {
    logVercelRequestShape(incoming);
  }
  await vercelHandler(incoming, outgoing);
};

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port });
  console.log(`API listening on http://localhost:${port}`);
}
