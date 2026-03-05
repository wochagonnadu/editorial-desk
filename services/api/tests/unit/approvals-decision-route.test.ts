// PATH: services/api/tests/unit/approvals-decision-route.test.ts
// WHAT: Route tests for manager decision flow from approvals queue
// WHY:  Verifies approve/request_changes paths and stale-version guard
// RELEVANT: services/api/src/routes/approvals/decision.ts,services/api/src/core/approval.ts

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import { decideApprovalStep } from '../../src/routes/approvals/decision';
import type { RouteDeps } from '../../src/routes/deps';

const coreMock = vi.hoisted(() => ({
  recordDecision: vi.fn(async () => undefined),
  activateNextStep: vi.fn(async () => null),
  closeOpenStepsAsChangesRequested: vi.fn(async () => undefined),
  completeFlowAndDraft: vi.fn(async () => undefined),
}));

const auditMock = vi.hoisted(() => ({
  logAudit: vi.fn(async () => undefined),
}));

vi.mock('../../src/core/approval.js', () => coreMock);
vi.mock('../../src/core/audit.js', () => auditMock);
vi.mock('../../src/core/approval', () => coreMock);
vi.mock('../../src/core/audit', () => auditMock);

const queryResult = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  limit: async () => rows,
});

const createDeps = (selectQueue: unknown[][]): RouteDeps => {
  const db = {
    select: () => ({ from: () => ({ where: () => queryResult(selectQueue.shift() ?? []) }) }),
  } as unknown as RouteDeps['db'];
  return {
    db,
    logger: createLogger(),
    content: {
      streamText: async () => (async function* () {})(),
      generateObject: async () => ({}) as never,
    },
    email: {
      sendEmail: async () => ({ messageId: 'm1' }),
      sendMagicLink: async () => ({ messageId: 'm2' }),
      buildReplyToAddress: () => 'x',
    },
  } as RouteDeps;
};

const createApp = (deps: RouteDeps) => {
  const app = new Hono();
  app.use('*', async (context, next) => {
    (context as { set: (key: string, value: unknown) => void }).set('authUser', {
      userId: 'u1',
      companyId: 'c1',
      role: 'manager',
    });
    await next();
  });
  app.onError((error, context) => toErrorResponse(context, error));
  app.post('/approvals/:stepId/decision', decideApprovalStep(deps));
  return app;
};

describe('approvals decision route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('send for review -> approve from queue sets draft approved', async () => {
    const app = createApp(
      createDeps([
        [{ id: 'step-1', approvalFlowId: 'flow-1' }],
        [
          {
            id: 'flow-1',
            status: 'active',
            flowType: 'sequential',
            deadlineHours: 48,
            draftId: 'draft-1',
          },
        ],
        [{ id: 'draft-1', companyId: 'c1', currentVersionId: 'v-1', status: 'needs_review' }],
        [{ id: 'step-1', status: 'approved' }],
      ]),
    );

    const response = await app.request('http://local/approvals/step-1/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'approve', expected_current_version_id: 'v-1' }),
    });
    const approveBody = await response.json();

    expect(response.status).toBe(200);
    expect(approveBody).toMatchObject({ draft: { status: 'approved' } });
    expect(coreMock.closeOpenStepsAsChangesRequested).not.toHaveBeenCalled();
    expect(coreMock.completeFlowAndDraft).toHaveBeenCalledWith(
      expect.anything(),
      'flow-1',
      'draft-1',
      'approved',
    );
    expect(auditMock.logAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'approval.granted' }),
    );
  });

  it('send for review -> request_changes moves draft to revisions and closes open steps', async () => {
    const app = createApp(
      createDeps([
        [{ id: 'step-1', approvalFlowId: 'flow-1' }],
        [
          {
            id: 'flow-1',
            status: 'active',
            flowType: 'sequential',
            deadlineHours: 48,
            draftId: 'draft-1',
          },
        ],
        [{ id: 'draft-1', companyId: 'c1', currentVersionId: 'v-1', status: 'needs_review' }],
        [
          { id: 'step-1', status: 'changes_requested' },
          { id: 'step-2', status: 'changes_requested' },
        ],
      ]),
    );

    const response = await app.request('http://local/approvals/step-1/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'request_changes',
        expected_current_version_id: 'v-1',
        comment: 'Need clearer CTA',
      }),
    });
    const requestChangesBody = await response.json();

    expect(response.status).toBe(200);
    expect(requestChangesBody).toMatchObject({ draft: { status: 'revisions' } });
    expect(coreMock.closeOpenStepsAsChangesRequested).toHaveBeenCalledWith(
      expect.anything(),
      'flow-1',
    );
    expect(coreMock.completeFlowAndDraft).toHaveBeenCalledWith(
      expect.anything(),
      'flow-1',
      'draft-1',
      'revisions',
    );
    expect(auditMock.logAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'approval.changes_requested' }),
    );
  });

  it('returns stale-version conflict when current version changed', async () => {
    const app = createApp(
      createDeps([
        [{ id: 'step-1', approvalFlowId: 'flow-1' }],
        [
          {
            id: 'flow-1',
            status: 'active',
            flowType: 'sequential',
            deadlineHours: 48,
            draftId: 'draft-1',
          },
        ],
        [{ id: 'draft-1', companyId: 'c1', currentVersionId: 'v-2', status: 'needs_review' }],
      ]),
    );

    const response = await app.request('http://local/approvals/step-1/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'approve', expected_current_version_id: 'v-1' }),
    });
    const staleBody = await response.json();

    expect(response.status).toBe(409);
    expect(staleBody).toMatchObject({ error: { code: 'STALE_VERSION' } });
  });
});
