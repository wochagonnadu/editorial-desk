// PATH: apps/web/src/services/team.ts
// WHAT: Team API adapter for users list, role updates, and invites
// WHY:  Keeps Settings team management logic out of page components
// RELEVANT: apps/web/src/pages/Settings.tsx,services/api/src/routes/team.ts

import { apiRequest } from './api/client';
import { mapDto } from './api/mapper';

export type TeamRole = 'owner' | 'manager';

export type TeamUser = {
  id: string;
  email: string;
  name: string;
  role: TeamRole;
  status: string;
};

type TeamUsersResponse = { data: TeamUser[] };
type TeamInviteResponse = {
  inviteId: string;
  email: string;
  role: TeamRole;
  status: string;
  reused: boolean;
};

export type TeamInviteInput = { email: string; name?: string; role: TeamRole };

export const fetchTeamUsers = async (token: string): Promise<TeamUser[]> => {
  const raw = await apiRequest<unknown>('/api/v1/team/users', { token });
  const response = mapDto<TeamUsersResponse>(raw);
  return response.data;
};

export const updateTeamUserRole = async (
  token: string,
  userId: string,
  role: TeamRole,
): Promise<void> => {
  await apiRequest(`/api/v1/team/users/${userId}/role`, {
    method: 'PATCH',
    token,
    body: { role },
  });
};

export const inviteTeamUser = async (
  token: string,
  input: TeamInviteInput,
): Promise<TeamInviteResponse> => {
  const raw = await apiRequest<unknown>('/api/v1/team/invites', {
    method: 'POST',
    token,
    body: input,
  });
  return mapDto<TeamInviteResponse>(raw);
};
