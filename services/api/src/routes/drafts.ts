// PATH: services/api/src/routes/drafts.ts
// WHAT: Route assembly for draft lifecycle and factcheck endpoints
// WHY:  Keeps draft HTTP contract organized across query and pipeline handlers
// RELEVANT: services/api/src/routes/drafts/pipeline.ts,services/api/src/routes/drafts/query.ts

import { Hono } from 'hono';
import { authMiddleware } from './auth-middleware.js';
import type { RouteDeps } from './deps.js';
import { createDraftComment, confirmClaim } from './drafts/actions.js';
import { sendForReview } from './drafts/approval.js';
import {
  createDraftFromTopic,
  factcheckDraft,
  generateDraft,
  reviseDraft,
} from './drafts/pipeline.js';
import { getDraftDetail, getDraftsList, getDraftVersions } from './drafts/query.js';
import { saveDraftVersion } from './drafts/versioning.js';
import { handleVoiceRating } from './drafts/voice-rating.js';

export const buildDraftRoutes = (deps: RouteDeps): Hono => {
  const router = new Hono();

  router.post('/:id/voice-rating', handleVoiceRating(deps));
  router.get('/:id/voice-rating', handleVoiceRating(deps));

  router.use('/*', authMiddleware);
  router.post('/', createDraftFromTopic(deps));
  router.get('/', getDraftsList(deps));
  router.get('/:id', getDraftDetail(deps));
  router.get('/:id/versions', getDraftVersions(deps));
  router.post('/:id/versions', saveDraftVersion(deps));
  router.post('/:id/generate', generateDraft(deps));
  router.post('/:id/factcheck', factcheckDraft(deps));
  router.post('/:id/revise', reviseDraft(deps));
  router.post('/:id/send-for-review', sendForReview(deps));
  router.post('/:id/comments', createDraftComment(deps));
  router.post('/:id/claims/:claim_id/expert-confirm', confirmClaim(deps));

  return router;
};
