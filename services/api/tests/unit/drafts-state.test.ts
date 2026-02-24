// PATH: services/api/tests/unit/drafts-state.test.ts
// WHAT: Unit tests for draft status transition rules
// WHY:  Prevents invalid lifecycle transitions in editorial pipeline
// RELEVANT: services/api/src/core/drafts.ts,services/api/src/core/errors.ts

import { AppError } from '../../src/core/errors';
import { transitionDraftStatus } from '../../src/core/drafts';

const dbForDraft = (draft: { id: string; status: string; updatedAt: Date }) => ({
  select: () => ({ from: () => ({ where: () => ({ limit: async () => [draft] }) }) }),
  update: () => ({ set: (values: Record<string, unknown>) => ({ where: () => ({ returning: async () => [{ ...draft, ...values }] }) }) }),
}) as unknown as Parameters<typeof transitionDraftStatus>[0];

describe('draft state machine', () => {
  it('allows valid transition drafting -> factcheck', async () => {
    const current = { id: 'd-1', status: 'drafting', updatedAt: new Date() };
    const updated = await transitionDraftStatus(dbForDraft(current), current.id, 'factcheck');
    expect(updated.status).toBe('factcheck');
  });

  it('returns current draft when transition is idempotent', async () => {
    const current = { id: 'd-2', status: 'needs_review', updatedAt: new Date() };
    const result = await transitionDraftStatus(dbForDraft(current), current.id, 'needs_review');
    expect(result.status).toBe('needs_review');
  });

  it('rejects invalid transition approved -> drafting', async () => {
    const current = { id: 'd-3', status: 'approved', updatedAt: new Date() };
    await expect(transitionDraftStatus(dbForDraft(current), current.id, 'drafting')).rejects.toMatchObject({ code: 'INVALID_STATE', status: 422 } satisfies Pick<AppError, 'code' | 'status'>);
  });
});
