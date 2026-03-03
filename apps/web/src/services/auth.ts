// PATH: apps/web/src/services/auth.ts
// WHAT: Auth API methods and DTO mapping for session
// WHY:  Keeps login/verify contract isolated from UI components
// RELEVANT: apps/web/src/services/api/client.ts,apps/web/src/services/session.tsx

import { apiRequest } from './api/client';
import { mapDto } from './api/mapper';

export type SessionUser = {
  id: string;
  email: string;
  role: 'owner' | 'manager';
  companyId: string;
};

export type SessionData = {
  token: string;
  user: SessionUser;
};

type VerifyResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'owner' | 'manager';
    companyId: string;
  };
};

type LoginResponse = {
  message: string;
  devMagicToken?: string;
};

export const loginWithMagicLink = async (email: string): Promise<LoginResponse> => {
  const raw = await apiRequest<unknown>(`/api/v1/auth/login?email=${encodeURIComponent(email)}`, {
    method: 'POST',
  });
  return mapDto<LoginResponse>(raw);
};

export const verifyMagicLink = async (token: string): Promise<SessionData> => {
  const raw = await apiRequest<unknown>(`/api/v1/auth/verify?token=${encodeURIComponent(token)}`);
  const response = mapDto<VerifyResponse>(raw);
  return {
    token: response.token,
    user: {
      id: response.user.id,
      email: response.user.email,
      role: response.user.role,
      companyId: response.user.companyId,
    },
  };
};
