// PATH: services/api/tests/unit/approval.test.ts
// WHAT: Unit tests for approval step transitions and version safety
// WHY:  Ensures one-click approval cannot bypass stale-version guards
// RELEVANT: services/api/src/core/approval.ts,services/api/src/core/errors.ts

import { AppError } from '../../src/core/errors';
import { activateNextStep, recordDecision } from '../../src/core/approval';

const dbWithQueuedSelects = (queue: unknown[]) => ({
  select: () => ({
    from: () => ({
      where: () => ({
        limit: async () => (queue.shift() as unknown[]) ?? [],
        orderBy: () => ({ limit: async () => (queue.shift() as unknown[]) ?? [] }),
      }),
    }),
  }),
  update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ id: 'step-1', status: 'pending', deadlineAt: new Date() }] }) }) }),
  insert: () => ({ values: () => ({ returning: async () => [{ id: 'decision-1' }] }) }),
}) as unknown as Parameters<typeof recordDecision>[0];

describe('approval core', () => {
  it('activates next waiting step', async () => {
    const db = dbWithQueuedSelects([[{ id: 'step-1', status: 'waiting' }]]);
    const next = await activateNextStep(db, 'flow-1', 48);
    expect(next?.status).toBe('pending');
  });

  it('records decision when version matches current draft version', async () => {
    const db = dbWithQueuedSelects([
      [{ id: 'step-1', status: 'pending', approvalFlowId: 'flow-1' }],
      [{ id: 'flow-1', draftId: 'draft-1' }],
      [{ id: 'draft-1', currentVersionId: 'ver-1' }],
    ]);
    const result = await recordDecision(db, 'step-1', 'ver-1', 'approved', 'ok');
    expect(result.saved.id).toBe('decision-1');
  });

  it('throws stale version error when decision references old version', async () => {
    const db = dbWithQueuedSelects([
      [{ id: 'step-1', status: 'pending', approvalFlowId: 'flow-1' }],
      [{ id: 'flow-1', draftId: 'draft-1' }],
      [{ id: 'draft-1', currentVersionId: 'ver-2' }],
    ]);
    await expect(recordDecision(db, 'step-1', 'ver-1', 'approved')).rejects.toMatchObject({ code: 'STALE_VERSION', status: 409 } satisfies Pick<AppError, 'code' | 'status'>);
  });
});
