// PATH: services/api/src/routes/drafts/pipeline-create.ts
// WHAT: Handlers for draft creation and first generation stream
// WHY:  Starts US2 lifecycle from approved topic to first draft version
// RELEVANT: services/api/src/core/drafts.ts,services/api/src/routes/drafts/sse.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { createDraft, createVersion, transitionDraftStatus } from '../../core/drafts.js';
import { AppError } from '../../core/errors.js';
import { DrizzleDraftStore, draftTable, draftVersionTable, expertTable, topicTable } from '../../providers/db/index.js';
import { getAuthUser } from '../auth-middleware.js';
import type { RouteDeps } from '../deps.js';
import { sseResponse } from './sse.js';

const readBody = async (context: Context) => (await context.req.json().catch(() => ({}))) as Record<string, unknown>;

export const createDraftFromTopic = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const body = await readBody(context);
  if (typeof body.topic_id !== 'string') throw new AppError(400, 'VALIDATION_ERROR', 'topic_id is required');
  const draft = await createDraft(deps.db, new DrizzleDraftStore(deps.db), authUser.companyId, body.topic_id);
  return context.json({ id: draft.id, topic_id: draft.topicId, expert_id: draft.expertId, status: draft.status, current_version: null }, 201);
};

export const generateDraft = (deps: RouteDeps) => async (context: Context) => {
  const authUser = getAuthUser(context);
  const draftId = context.req.param('id');
  const [draft] = await deps.db.select().from(draftTable).where(and(eq(draftTable.id, draftId), eq(draftTable.companyId, authUser.companyId))).limit(1);
  if (!draft) throw new AppError(404, 'NOT_FOUND', 'Draft not found');

  if (draft.status !== 'drafting' && draft.currentVersionId) {
    const [existing] = await deps.db.select().from(draftVersionTable).where(eq(draftVersionTable.id, draft.currentVersionId)).limit(1);
    if (existing) {
      const stream = async function* () {
        yield { type: 'done', version_id: existing.id, version_number: existing.versionNumber, voice_score: existing.voiceScore };
      };
      return sseResponse(stream());
    }
  }

  const [topic] = await deps.db.select().from(topicTable).where(eq(topicTable.id, draft.topicId)).limit(1);
  const [expert] = await deps.db.select().from(expertTable).where(eq(expertTable.id, draft.expertId)).limit(1);
  if (!topic || !expert) throw new AppError(404, 'NOT_FOUND', 'Topic or expert not found');

  const stream = async function* () {
    const prompt = `Write draft in ${expert.name}'s style on topic: ${topic.title}.`;
    const chunks: string[] = [];
    for await (const chunk of await deps.content.streamText({ model: process.env.OPENROUTER_GENERATE_MODEL ?? 'openai/gpt-4o-mini', prompt })) {
      chunks.push(chunk);
      yield { type: 'chunk', text: chunk };
    }
    const content = chunks.join('').trim() || `Draft on topic: ${topic.title}`;
    const version = await createVersion(new DrizzleDraftStore(deps.db), draft.id, content, content.slice(0, 180), 0.8, 'system');
    await transitionDraftStatus(deps.db, draft.id, 'factcheck');
    yield { type: 'done', version_id: version.id, version_number: version.versionNumber, voice_score: version.voiceScore };
  };

  return sseResponse(stream());
};
