// PATH: services/api/tests/unit/stale-version.test.ts
// WHAT: Unit tests for stale-version inbound reply detection
// WHY:  Protects experts from acting on outdated draft revisions
// RELEVANT: services/api/src/routes/webhooks-inbound-draft.ts,services/api/src/routes/docs.ts

import { vi } from 'vitest';
import { processDraftInbound } from '../../src/routes/webhooks-inbound-draft';
import type { RouteDeps } from '../../src/routes/deps';

vi.mock('../../src/core/audit', () => ({ logAudit: vi.fn(async () => undefined) }));

const makeDb = (queue: unknown[]) => ({
  select: () => ({ from: () => ({ where: () => ({ limit: async () => (queue.shift() as unknown[]) ?? [] }) }) }),
  insert: () => ({ values: async () => undefined }),
}) as unknown as RouteDeps['db'];

describe('stale inbound detection', () => {
  it('marks inbound reply as stale and sends recovery email', async () => {
    const db = makeDb([
      [{ id: 'exp-1', email: 'exp@example.com', companyId: 'cmp-1' }],
      [{ id: 'draft-1', companyId: 'cmp-1', currentVersionId: 'dv-2' }],
      [{ id: 'dv-2', versionNumber: 2 }],
    ]);
    const email = { sendEmail: vi.fn(async () => ({ messageId: 'm-1' })) };
    const deps = { db, email } as unknown as RouteDeps;
    const result = await processDraftInbound(deps, { from: 'exp@example.com', to: 'reply+d_draft-1_v_1_exp_exp-1_sig@inbound.newsroom.dev' });

    expect(result).toEqual({ handled: true, stale: true });
    expect(email.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('returns stale=false for current version replies', async () => {
    const db = makeDb([
      [{ id: 'exp-1', email: 'exp@example.com', companyId: 'cmp-1' }],
      [{ id: 'draft-1', companyId: 'cmp-1', currentVersionId: 'dv-2' }],
      [{ id: 'dv-2', versionNumber: 1 }],
    ]);
    const email = { sendEmail: vi.fn(async () => ({ messageId: 'm-1' })) };
    const deps = { db, email } as unknown as RouteDeps;
    const result = await processDraftInbound(deps, { from: 'exp@example.com', to: 'reply+d_draft-1_v_1_exp_exp-1_sig@inbound.newsroom.dev' });

    expect(result).toEqual({ handled: true, stale: false });
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
});
