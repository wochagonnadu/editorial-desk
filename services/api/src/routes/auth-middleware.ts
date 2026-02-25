// PATH: services/api/src/routes/auth-middleware.ts
// WHAT: Bearer auth middleware and auth-user accessor
// WHY:  Protects private endpoints with shared token verification
// RELEVANT: services/api/src/routes/auth-token.ts,services/api/src/routes/companies.ts

import type { Context, MiddlewareHandler } from 'hono';
import { AppError } from '../core/errors';
import { getDevAuthPayload, isDevAuthBypassEnabled } from './auth-dev';
import { verifySessionToken } from './auth-token';

export interface AuthUser {
  userId: string;
  companyId: string;
  role: 'owner' | 'manager';
}

export const authMiddleware: MiddlewareHandler = async (context, next) => {
  if (isDevAuthBypassEnabled()) {
    context.set('authUser', getDevAuthPayload());
    await next();
    return;
  }

  const authorization = context.req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing bearer token');
  }

  const token = authorization.replace('Bearer ', '').trim();
  const authUser = await verifySessionToken(token);
  context.set('authUser', authUser);
  await next();
};

export const getAuthUser = (context: Context): AuthUser => {
  const authUser = context.get('authUser') as AuthUser | undefined;
  if (!authUser) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }
  return authUser;
};
