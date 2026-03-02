// PATH: services/api/src/routes/webhooks-click-topic.ts
// WHAT: Topic approve/reject one-click webhook handler
// WHY:  Lets managers process weekly proposals directly from email
// RELEVANT: services/api/src/core/topics.ts,services/api/src/routes/webhooks.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { logAudit } from '../core/audit';
import { AppError } from '../core/errors';
import { notificationTable, topicTable, userTable } from '../providers/db';
import type { RouteDeps } from './deps';

const parseTopicClick = async (context: Context) => {
  const body = (await context.req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(context.req.query('action') ?? body.action ?? '');
  const token = String(context.req.query('token') ?? body.token ?? '');
  const topicId = String(context.req.query('topic') ?? body.topic ?? '');
  return { action, token, topicId };
};

const TOPIC_CLICK_TTL_HOURS = 168;

export const processTopicClick = (deps: RouteDeps) => async (context: Context) => {
  const { action, token, topicId } = await parseTopicClick(context);
  if (!token || !topicId || !['topic_approve', 'topic_reject'].includes(action)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'invalid topic click payload');
  }

  const [notification] = await deps.db
    .select()
    .from(notificationTable)
    .where(
      and(eq(notificationTable.emailToken, token), eq(notificationTable.referenceType, 'topic')),
    )
    .limit(1);
  if (!notification || !notification.referenceId || notification.referenceId !== topicId)
    throw new AppError(401, 'UNAUTHORIZED', 'invalid token');
  if (notification.status === 'replied') throw new AppError(409, 'CONFLICT', 'token already used');
  if (Date.now() - notification.createdAt.getTime() > TOPIC_CLICK_TTL_HOURS * 3600_000)
    throw new AppError(401, 'UNAUTHORIZED', 'token expired');

  const [topic] = await deps.db
    .select()
    .from(topicTable)
    .where(and(eq(topicTable.id, topicId), eq(topicTable.companyId, notification.companyId)))
    .limit(1);
  if (!topic) throw new AppError(404, 'NOT_FOUND', 'topic not found');

  const nextStatus = action === 'topic_approve' ? 'approved' : 'rejected';
  await deps.db
    .update(topicTable)
    .set({ status: nextStatus } as Partial<typeof topicTable.$inferInsert>)
    .where(eq(topicTable.id, topic.id));
  await deps.db
    .update(notificationTable)
    .set({ status: 'replied', repliedAt: new Date() } as Partial<
      typeof notificationTable.$inferInsert
    >)
    .where(eq(notificationTable.id, notification.id));

  const [actor] = await deps.db
    .select()
    .from(userTable)
    .where(
      and(
        eq(userTable.companyId, notification.companyId),
        eq(userTable.email, notification.recipientEmail),
      ),
    )
    .limit(1);
  await logAudit(deps.db, {
    companyId: notification.companyId,
    actorType: actor ? 'user' : 'system',
    actorId: actor?.id,
    action: `topic.${nextStatus}`,
    entityType: 'topic',
    entityId: topic.id,
    metadata: { source: 'email_click' },
  });

  return context.json({ ok: true, id: topic.id, status: nextStatus });
};
