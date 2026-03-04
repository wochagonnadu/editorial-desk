// PATH: services/api/src/routes/team-invites.ts
// WHAT: Team invite handler with company+email idempotency
// WHY:  Allows Settings to invite managers without duplicate pending invites
// RELEVANT: services/api/src/routes/team.ts,services/api/src/routes/auth.ts

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { logAudit } from '../core/audit.js';
import { AppError } from '../core/errors.js';
import { readJsonBodyStrict } from '../core/http/read-json-body.js';
import { notificationTable } from '../providers/db/index.js';
import { getAuthUser } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';
import { findOrCreateTeamMember, findPendingTeamInvite } from './team-invite-store.js';
import {
  assertOwnerRole,
  parseInviteEmail,
  parseInviteName,
  parseTeamRole,
} from './team-shared.js';

export const createTeamInvite = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  assertOwnerRole(authUser, 'Only owner can invite team members');
  const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
  const email = parseInviteEmail(body.email);
  const role = parseTeamRole(body.role);
  const name = parseInviteName(body.name, email);

  const member = await findOrCreateTeamMember(deps, authUser.companyId, email, name, role);
  const pendingInvite = await findPendingTeamInvite(deps, authUser.companyId, email);
  if (pendingInvite?.magicLinkToken) {
    return context.json({
      invite_id: pendingInvite.id,
      email,
      role: member.role,
      status: 'pending',
      reused: true,
    });
  }

  const token = randomUUID();
  const expiresAt = new Date(
    Date.now() + Number(process.env.MAGIC_LINK_TTL_HOURS ?? 72) * 3600_000,
  );
  const [invite] = await deps.db
    .insert(notificationTable)
    .values({
      companyId: authUser.companyId,
      recipientEmail: email,
      notificationType: 'team_invite',
      referenceType: 'user',
      referenceId: member.id,
      emailToken: randomUUID(),
      magicLinkToken: token,
      magicLinkExpiresAt: expiresAt,
      magicLinkRevoked: false,
      status: 'sent',
      sentAt: new Date(),
    } as typeof notificationTable.$inferInsert)
    .returning();

  try {
    await deps.email.sendMagicLink({
      to: email,
      token,
      expiresAt,
      appUrl: process.env.APP_URL ?? 'http://localhost:5173',
    });
  } catch {
    await deps.db
      .update(notificationTable)
      .set({ status: 'failed', magicLinkRevoked: true } as Partial<
        typeof notificationTable.$inferInsert
      >)
      .where(eq(notificationTable.id, invite.id));
    throw new AppError(502, 'EMAIL_DELIVERY_FAILED', 'Failed to send team invite email');
  }
  await logAudit(deps.db, {
    companyId: authUser.companyId,
    actorType: 'user',
    actorId: authUser.userId,
    action: 'team.invite_sent',
    entityType: 'user',
    entityId: member.id,
    metadata: { invite_id: invite.id, email, role: member.role, reused: false },
  });

  return context.json({
    invite_id: invite.id,
    email,
    role: member.role,
    status: 'pending',
    reused: false,
  });
};
