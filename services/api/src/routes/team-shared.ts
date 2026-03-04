// PATH: services/api/src/routes/team-shared.ts
// WHAT: Shared validators and guards for team management routes
// WHY:  Keeps team handlers small and consistent on role/email contracts
// RELEVANT: services/api/src/routes/team.ts,services/api/src/routes/auth-middleware.ts

import type { UserRole } from '@newsroom/shared';
import { AppError } from '../core/errors.js';
import type { AuthUser } from './auth-middleware.js';

const USER_ROLES: UserRole[] = ['owner', 'manager'];

export const parseTeamRole = (value: unknown): UserRole => {
  if (typeof value !== 'string' || !USER_ROLES.includes(value as UserRole)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'role must be owner or manager');
  }
  return value as UserRole;
};

export const parseInviteEmail = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'email must be valid');
  }
  const email = value.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'email must be valid');
  }
  return email;
};

export const parseInviteName = (value: unknown, email: string): string => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return email.split('@')[0] ?? 'Manager';
};

export const assertOwnerRole = (authUser: AuthUser, message: string) => {
  if (authUser.role !== 'owner') throw new AppError(403, 'FORBIDDEN', message);
};
