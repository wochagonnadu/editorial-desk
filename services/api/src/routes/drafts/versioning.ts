// PATH: services/api/src/routes/drafts/versioning.ts
// WHAT: Manual draft save handler creating immutable versions
// WHY:  FR-023 и edge case concurrent editing — каждый save = новая версия
// RELEVANT: services/api/src/routes/drafts.ts,services/api/src/providers/db/draft-store.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { logAudit } from '../../core/audit.js';
import { AppError } from '../../core/errors.js';
import { readJsonBodyStrict } from '../../core/http/read-json-body.js';
import { DrizzleDraftStore, draftTable } from '../../providers/db/index.js';
import { getAuthUser } from '../auth-middleware.js';
import type { RouteDeps } from '../deps.js';

export const saveDraftVersion = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const body = await readJsonBodyStrict<Record<string, unknown>>(context.req.raw);
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) throw new AppError(400, 'VALIDATION_ERROR', 'content is required');

  const [draft] = await deps.db
    .select()
    .from(draftTable)
    .where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId)))
    .limit(1);
  if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');

  const expectedId =
    typeof body.expected_current_version_id === 'string'
      ? body.expected_current_version_id
      : undefined;
  const concurrentEdit = Boolean(
    expectedId && draft.currentVersionId && expectedId !== draft.currentVersionId,
  );

  const summary =
    typeof body.summary === 'string' && body.summary.trim()
      ? body.summary.trim()
      : content.slice(0, 180);
  const version = await new DrizzleDraftStore(deps.db).createVersion({
    draftId: draft.id,
    content,
    summary,
    createdBy: 'revision',
    diffFromPrevious: { summary },
  });

  await logAudit(deps.db, {
    companyId: authUser.companyId,
    actorType: 'user',
    actorId: authUser.userId,
    action: concurrentEdit ? 'draft.version_saved_concurrent' : 'draft.version_saved',
    entityType: 'draft',
    entityId: draft.id,
    draftVersionId: version.id,
    metadata: {
      expected_version_id: expectedId ?? null,
      previous_version_id: draft.currentVersionId ?? null,
    },
  });

  return context.json(
    { id: version.id, version_number: version.versionNumber, concurrent_edit: concurrentEdit },
    201,
  );
};
