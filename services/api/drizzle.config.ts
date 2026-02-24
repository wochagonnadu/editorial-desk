// PATH: services/api/drizzle.config.ts
// WHAT: Drizzle Kit configuration for API schema and migrations
// WHY:  Standardizes migration generation for local and Supabase environments
// RELEVANT: services/api/src/providers/db/schema.ts,services/api/package.json

import type { Config } from 'drizzle-kit';

export default {
  schema: './src/providers/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
} satisfies Config;
