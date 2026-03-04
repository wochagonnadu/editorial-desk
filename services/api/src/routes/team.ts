// PATH: services/api/src/routes/team.ts
// WHAT: Team management API routes for users, roles, and invites
// WHY:  Enables Settings to manage company users from UI without extra modules
// RELEVANT: services/api/src/routes/team-users.ts,services/api/src/routes/team-invites.ts

import { Hono } from 'hono';
import type { RouteDeps } from './deps.js';
import { createTeamInvite } from './team-invites.js';
import { listTeamUsers, updateTeamUserRole } from './team-users.js';

export const buildTeamRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.get('/users', listTeamUsers(deps));
  router.patch('/users/:id/role', updateTeamUserRole(deps));
  router.post('/invites', createTeamInvite(deps));

  return router;
};
