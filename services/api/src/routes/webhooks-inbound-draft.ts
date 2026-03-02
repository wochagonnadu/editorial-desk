// PATH: services/api/src/routes/webhooks-inbound-draft.ts
// WHAT: Handles draft reply tokens and stale-version safety in inbound emails
// WHY:  Prevents actions on old versions and sends safe current-version link
// RELEVANT: services/api/src/routes/webhooks.ts,services/api/src/routes/docs.ts

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { logAudit } from '../core/audit.js';
import { draftTable, draftVersionTable, expertTable, notificationTable } from '../providers/db/index.js';
import type { RouteDeps } from './deps.js';

const parseDraftReplyAddress = (
  to: string,
): { draftId: string; version: number; expertId: string } | null => {
  const local = to.split('@')[0] ?? '';
  const token = local.split('+')[1] ?? '';
  const match = token.match(/^d_([^_]+)_v_(\d+)_exp_([^_]+)_[A-Za-z0-9_-]+$/);
  if (!match) return null;
  return { draftId: match[1], version: Number(match[2]), expertId: match[3] };
};

const sameEmail = (left: string, right: string) =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

const docsLink = (draftId: string, token: string) => {
  const apiUrl = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${apiUrl}/api/v1/docs/${draftId}?token=${token}`;
};

export const processDraftInbound = async (
  deps: RouteDeps,
  payload: { from?: string; to?: string },
): Promise<{ handled: boolean; stale: boolean }> => {
  const token = parseDraftReplyAddress(payload.to ?? '');
  if (!token) return { handled: false, stale: false };

  const [expert] = await deps.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, token.expertId))
    .limit(1);
  if (!expert || !payload.from || !sameEmail(expert.email, payload.from))
    return { handled: true, stale: false };

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, token.draftId), eq(draftTable.companyId, expert.companyId)))
    .limit(1);
  if (!draft || !draft.currentVersionId) return { handled: true, stale: false };

  const [currentVersion] = await deps.db
    .select()
    .from(draftVersionTable)
    .where(eq(draftVersionTable.id, draft.currentVersionId))
    .limit(1);
  if (!currentVersion) return { handled: true, stale: false };
  if (token.version === currentVersion.versionNumber) return { handled: true, stale: false };

  const magicToken = randomUUID();
  const magicLinkExpiresAt = new Date(
    Date.now() + Number(process.env.MAGIC_LINK_TTL_HOURS ?? 72) * 3600_000,
  );
  await deps.db.insert(notificationTable).values({
    companyId: draft.companyId,
    recipientEmail: payload.from,
    notificationType: 'stale_version_notice',
    referenceType: 'draft',
    referenceId: currentVersion.id,
    emailToken: randomUUID(),
    magicLinkToken: magicToken,
    magicLinkExpiresAt,
    magicLinkRevoked: false,
    status: 'sent',
    sentAt: new Date(),
  } as unknown as typeof notificationTable.$inferInsert);

  const link = docsLink(draft.id, magicToken);
  await deps.email.sendEmail({
    to: payload.from,
    subject: `Актуальная версия: v${currentVersion.versionNumber}`,
    textBody: `Вы ответили на устаревшую версию. Актуальна версия v${currentVersion.versionNumber}: ${link}`,
    html: `<p>Вы ответили на устаревшую версию.</p><p>Актуальна версия <strong>v${currentVersion.versionNumber}</strong>: <a href="${link}">${link}</a></p>`,
  });

  await logAudit(deps.db, {
    companyId: draft.companyId,
    actorType: 'expert',
    actorId: expert.id,
    action: 'draft.stale_reply_blocked',
    entityType: 'draft',
    entityId: draft.id,
    draftVersionId: currentVersion.id,
    metadata: { referenced_version: token.version, current_version: currentVersion.versionNumber },
  });

  return { handled: true, stale: true };
};
