// PATH: services/api/src/routes/auth-dev.ts
// WHAT: Dev auth bypass flags and default session identity
// WHY:  Lets local development continue when login flow is not needed
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/auth-middleware.ts

import type { SessionPayload } from './auth-token.js';

export const DEV_BYPASS_TOKEN = 'dev-bypass-token';

const isTrue = (value: string | undefined): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const isDevAuthBypassEnabled = (): boolean => isTrue(process.env.DEV_DISABLE_AUTH);

export const getDevAuthPayload = (): SessionPayload => ({
  userId: process.env.DEV_AUTH_USER_ID ?? '00000000-0000-0000-0000-000000000001',
  companyId: process.env.DEV_AUTH_COMPANY_ID ?? '00000000-0000-0000-0000-000000000001',
  role: process.env.DEV_AUTH_ROLE === 'manager' ? 'manager' : 'owner',
});

export const getDevAuthEmail = (): string => process.env.DEV_AUTH_EMAIL ?? 'mail@mail.com';
