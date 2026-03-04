// PATH: services/api/src/core/observability/log-stage.ts
// WHAT: Unified stage log helper for create/login flows
// WHY:  Keeps observability fields stable across auth/experts/topics/drafts
// RELEVANT: services/api/src/routes/auth.ts,services/api/src/routes/experts.ts,services/api/src/routes/topics.ts,services/api/src/routes/drafts/pipeline-create.ts

import type { Logger } from '../../providers/logger.js';

type StageStatus = 'start' | 'ok' | 'error';

interface StageLogInput {
  flow: string;
  stage: string;
  status: StageStatus;
  companyId?: string;
  actorId?: string;
  durationMs?: number;
  entityId?: string;
  details?: Record<string, unknown>;
}

export const logStage = (logger: Logger, input: StageLogInput): void => {
  logger.info('flow.stage', {
    flow: input.flow,
    stage: input.stage,
    status: input.status,
    company_id: input.companyId,
    actor_id: input.actorId,
    entity_id: input.entityId,
    duration_ms: input.durationMs,
    ...(input.details ?? {}),
  });
};
