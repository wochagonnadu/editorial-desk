// PATH: apps/web/src/services/user.ts
// WHAT: User profile and setup-status API adapters for first-run routing
// WHY:  Keeps manager setup contracts reusable between verify flow and future setup screen
// RELEVANT: apps/web/src/pages/Login.tsx,apps/web/src/services/session.tsx,services/api/src/routes/users.ts

import { apiRequest } from './api/client';
import { mapDto } from './api/mapper';

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager';
};

export type SetupStatus = {
  setupCompletedAt?: string | null;
  setupRequired: boolean;
};

type SetupStatusResponse = {
  setupCompletedAt?: string | null;
  setupRequired: boolean;
};

export const fetchCurrentUser = async (token: string): Promise<UserProfile> => {
  return apiRequest<UserProfile>('/api/v1/users/me', { token });
};

export const updateCurrentUser = async (
  token: string,
  input: { name: string },
): Promise<UserProfile> => {
  return apiRequest<UserProfile>('/api/v1/users/me', {
    method: 'PATCH',
    token,
    body: input,
  });
};

export const fetchSetupStatus = async (token: string): Promise<SetupStatus> => {
  const raw = await apiRequest<unknown>('/api/v1/users/me/setup-status', { token });
  return mapDto<SetupStatusResponse>(raw);
};
