// PATH: services/api/tests/unit/draft-editor-api-state.test.ts
// WHAT: Route tests for draft editor save API state handling
// WHY:  Protects editor saves from stale-version overwrites
// RELEVANT: services/api/src/routes/drafts/versioning.ts,services/api/tests/unit/drafts-generation-policy.test.ts

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toErrorResponse } from '../../src/core/errors';
import { createLogger } from '../../src/providers/logger';
import { saveDraftVersion } from '../../src/routes/drafts/versioning';
import type { RouteDeps } from '../../src/routes/deps';

const storeMock = vi.hoisted(() => ({
  createVersion: vi.fn(async () => ({ id: 'v-2', versionNumber: 2 })),
}));

const auditMock = vi.hoisted(() => ({
  logAudit: vi.fn(async () => undefined),
}));

vi.mock('../../src/core/audit.js', () => auditMock);
vi.mock('../../src/providers/db/index.js', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return {
    ...actual,
    DrizzleDraftStore: vi.fn(() => ({ createVersion: storeMock.createVersion })),
  };
});

const createDeps = (draft: { id: string; companyId: string; currentVersionId: string }) =>
  ({
    db: {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [draft] }) }) }),
    },
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
  }) as unknown as RouteDeps;

const createApp = (deps: RouteDeps) => {
  const app = new Hono();
  app.use('*', async (context, next) => {
    (context as { set: (key: string, value: unknown) => void }).set('authUser', {
      userId: 'u-1',
      companyId: 'c-1',
      role: 'manager',
    });
    await next();
  });
  app.onError((error, context) => toErrorResponse(context, error));
  app.post('/drafts/:id/versions', saveDraftVersion(deps));
  return app;
};

describe('draft editor API state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves a new draft version when expected version is current', async () => {
    const app = createApp(createDeps({ id: 'd-1', companyId: 'c-1', currentVersionId: 'v-1' }));

    const response = await app.request('http://local/drafts/d-1/versions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Updated draft content',
        summary: 'Updated summary',
        expected_current_version_id: 'v-1',
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'v-2', version_number: 2 });
    expect(storeMock.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({ draftId: 'd-1', content: 'Updated draft content' }),
    );
    expect(auditMock.logAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'draft.version_saved' }),
    );
  });

  it('rejects stale save without creating a version', async () => {
    const app = createApp(createDeps({ id: 'd-1', companyId: 'c-1', currentVersionId: 'v-2' }));

    const response = await app.request('http://local/drafts/d-1/versions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        content: 'Stale draft content',
        summary: 'Stale summary',
        expected_current_version_id: 'v-1',
      }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'STALE_VERSION' } });
    expect(storeMock.createVersion).not.toHaveBeenCalled();
    expect(auditMock.logAudit).not.toHaveBeenCalled();
  });
});
