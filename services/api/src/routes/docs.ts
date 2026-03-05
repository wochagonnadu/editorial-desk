// PATH: services/api/src/routes/docs.ts
// WHAT: Read-only draft access endpoint by magic link token
// WHY:  Supports secure email-first document viewing with TTL and stale checks
// RELEVANT: services/api/src/routes/webhooks-inbound-draft.ts,specs/001-virtual-newsroom-mvp/contracts/webhooks.md

import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { buildDiffSummaryBullets } from '../core/diff-summary.js';
import { AppError } from '../core/errors.js';
import {
  draftTable,
  draftVersionTable,
  expertTable,
  notificationTable,
  topicTable,
} from '../providers/db/index.js';
import type { RouteDeps } from './deps.js';

export const buildDocsRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.get('/:draft_id', async (context) => {
    const token = context.req.query('token');
    const draftId = context.req.param('draft_id');
    if (!token) throw new AppError(401, 'INVALID_TOKEN', 'Magic link token is required');

    const [notification] = await deps.db
      .select()
      .from(notificationTable)
      .where(eq(notificationTable.magicLinkToken, token))
      .limit(1);
    if (!notification) throw new AppError(401, 'INVALID_TOKEN', 'Magic link token not found');
    if (
      notification.magicLinkRevoked ||
      !notification.magicLinkExpiresAt ||
      notification.magicLinkExpiresAt.getTime() < Date.now()
    ) {
      throw new AppError(410, 'TOKEN_EXPIRED', 'Magic link expired or revoked');
    }

    const [draft] = await deps.db
      .select()
      .from(draftTable)
      .where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, notification.companyId)))
      .limit(1);
    if (!draft || !draft.currentVersionId) throw new AppError(404, 'NOT_FOUND', 'Draft not found');
    if (notification.referenceId && notification.referenceId !== draft.currentVersionId) {
      throw new AppError(409, 'STALE_VERSION', 'Token references an old draft version');
    }

    const [version] = await deps.db
      .select()
      .from(draftVersionTable)
      .where(eq(draftVersionTable.id, draft.currentVersionId))
      .limit(1);
    if (!version) throw new AppError(404, 'NOT_FOUND', 'Draft version not found');

    const [baseVersion] =
      version.versionNumber > 1
        ? await deps.db
            .select()
            .from(draftVersionTable)
            .where(
              and(
                eq(draftVersionTable.draftId, draft.id),
                eq(draftVersionTable.versionNumber, version.versionNumber - 1),
              ),
            )
            .limit(1)
        : [];

    const [topic] = await deps.db
      .select()
      .from(topicTable)
      .where(eq(topicTable.id, draft.topicId))
      .limit(1);
    const [expert] = await deps.db
      .select()
      .from(expertTable)
      .where(eq(expertTable.id, draft.expertId))
      .limit(1);
    const diffSummary = buildDiffSummaryBullets(baseVersion?.content ?? null, version.content);

    return context.json({
      id: draft.id,
      status: draft.status,
      topic: topic ? { id: topic.id, title: topic.title } : null,
      expert: expert ? { id: expert.id, name: expert.name } : null,
      current_version: {
        id: version.id,
        version_number: version.versionNumber,
        content: version.content,
        summary: version.summary,
        created_at: version.createdAt,
      },
      version_context: {
        current: {
          id: version.id,
          version_number: version.versionNumber,
          created_at: version.createdAt,
        },
        base: baseVersion
          ? {
              id: baseVersion.id,
              version_number: baseVersion.versionNumber,
              created_at: baseVersion.createdAt,
            }
          : null,
      },
      diff: {
        source_version: baseVersion
          ? { id: baseVersion.id, version_number: baseVersion.versionNumber }
          : null,
        target_version: { id: version.id, version_number: version.versionNumber },
        summary: diffSummary,
      },
      read_only: true,
    });
  });

  return router;
};
