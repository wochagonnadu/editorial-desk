// PATH: services/api/tests/integration/content-cycle.test.ts
// WHAT: Integration tests for critical content lifecycle flows
// WHY:  Verifies key MVP scenario from topic intake to approval safety
// RELEVANT: services/api/src/routes/topics.ts,services/api/src/routes/drafts.ts,services/api/src/routes/approvals.ts

import { Hono } from 'hono';
import type { ContentPort } from '@newsroom/shared';
import { recordDecision } from '../../src/core/approval';
import { toErrorResponse } from '../../src/core/errors';
import { buildReport, extractClaims, verifyHighRiskClaims } from '../../src/core/factcheck';
import { buildVoiceProfile, calculateVoiceScore, generateVoiceTest } from '../../src/core/voice';
import {
  approvalDecisionTable,
  approvalFlowTable,
  approvalStepTable,
  auditLogTable,
  claimTable,
  companyTable,
  draftTable,
  draftVersionTable,
  expertTable,
  factcheckReportTable,
  notificationTable,
  topicTable,
  userTable,
  voiceProfileTable,
} from '../../src/providers/db';
import { createLogger } from '../../src/providers/logger';
import { buildApprovalsRoutes } from '../../src/routes/approvals';
import { buildDocsRoutes } from '../../src/routes/docs';
import { buildDraftRoutes } from '../../src/routes/drafts';
import { buildTopicRoutes } from '../../src/routes/topics';
import type { RouteDeps } from '../../src/routes/deps';

const dbQueue = (queue: unknown[]) => ({
  select: () => ({ from: () => ({ where: () => ({ limit: async () => (queue.shift() as unknown[]) ?? [] }) }) }),
  insert: () => ({ values: () => ({ returning: async () => [{ id: 'decision-1' }] }) }),
  update: () => ({ set: () => ({ where: async () => undefined }) }),
}) as unknown as Parameters<typeof recordDecision>[0];

const originalDevAuth = {
  disabled: process.env.DEV_DISABLE_AUTH,
  userId: process.env.DEV_AUTH_USER_ID,
  companyId: process.env.DEV_AUTH_COMPANY_ID,
};

afterEach(() => {
  process.env.DEV_DISABLE_AUTH = originalDevAuth.disabled;
  process.env.DEV_AUTH_USER_ID = originalDevAuth.userId;
  process.env.DEV_AUTH_COMPANY_ID = originalDevAuth.companyId;
});

const result = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
  limit: async (count = rows.length) => rows.slice(0, count),
  orderBy: () => result(rows),
  returning: async () => rows,
});

const createApiHarness = () => {
  const now = new Date();
  const state = {
    topics: [] as Record<string, unknown>[],
    drafts: [] as Record<string, unknown>[],
    versions: [] as Record<string, unknown>[],
    claims: [] as Record<string, unknown>[],
    reports: [] as Record<string, unknown>[],
    flows: [] as Record<string, unknown>[],
    steps: [] as Record<string, unknown>[],
    decisions: [] as Record<string, unknown>[],
    notifications: [] as Record<string, unknown>[],
    audits: [] as Record<string, unknown>[],
    company: {
      id: 'c1',
      name: 'Clinical Desk',
      domain: 'medical',
      description: 'Evidence-based patient education',
      generationPolicy: {},
      createdAt: now,
      updatedAt: now,
    },
    expert: {
      id: 'e1',
      companyId: 'c1',
      managerUserId: 'u1',
      name: 'Dr Expert',
      roleTitle: 'Clinician',
      email: 'expert@desk.dev',
      domain: 'medical',
      status: 'active',
      createdAt: now,
    },
    user: {
      id: 'u1',
      companyId: 'c1',
      email: 'owner@desk.dev',
      name: 'Owner',
      role: 'owner',
      createdAt: now,
    },
  };
  const rowsFor = (table: unknown) => {
    if (table === topicTable) return state.topics;
    if (table === draftTable) return state.drafts;
    if (table === draftVersionTable) return state.versions;
    if (table === claimTable) return state.claims;
    if (table === factcheckReportTable) return state.reports;
    if (table === approvalFlowTable) return state.flows;
    if (table === approvalStepTable) return state.steps;
    if (table === approvalDecisionTable) return state.decisions;
    if (table === notificationTable) return state.notifications;
    if (table === auditLogTable) return state.audits;
    if (table === companyTable) return [state.company];
    if (table === expertTable) return [state.expert];
    if (table === userTable) return [state.user];
    if (table === voiceProfileTable) {
      return [{ id: 'vp1', expertId: 'e1', status: 'confirmed', profileData: { confidence: 0.9 } }];
    }
    return [];
  };
  const addRows = (table: unknown, value: Record<string, unknown> | Record<string, unknown>[]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => {
      const row: Record<string, unknown> = { id: `${values.length}-${Math.random()}`, createdAt: now, updatedAt: now, ...item };
      if (table === topicTable) state.topics.push({ ...row, id: `topic-${state.topics.length + 1}` });
      if (table === draftTable) state.drafts.push({ ...row, id: `draft-${state.drafts.length + 1}` });
      if (table === draftVersionTable) {
        const draft = state.drafts.find((item) => item.id === row.draftId);
        const saved = { ...row, id: `version-${state.versions.length + 1}` };
        state.versions.push(saved);
        if (draft) draft.currentVersionId = saved.id;
      }
      if (table === factcheckReportTable) state.reports.push({ ...row, id: `report-${state.reports.length + 1}` });
      if (table === claimTable) state.claims.push({ ...row, id: `claim-${state.claims.length + 1}` });
      if (table === approvalFlowTable) state.flows.push({ ...row, id: `flow-${state.flows.length + 1}` });
      if (table === approvalStepTable) state.steps.push({ ...row, id: `step-${state.steps.length + 1}` });
      if (table === approvalDecisionTable) state.decisions.push({ ...row, id: `decision-${state.decisions.length + 1}` });
      if (table === notificationTable) state.notifications.push({ ...row, id: `notification-${state.notifications.length + 1}` });
      if (table === auditLogTable) state.audits.push(row);
      return rowsFor(table).at(-1) ?? row;
    });
  };
  const db = {
    select: () => ({ from: (table: unknown) => ({ where: () => result(rowsFor(table)), orderBy: () => result(rowsFor(table)) }) }),
    insert: (table: unknown) => ({ values: (value: Record<string, unknown> | Record<string, unknown>[]) => result(addRows(table, value)) }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => result(rowsFor(table).map((row) => Object.assign(row, values))),
      }),
    }),
  } as unknown as RouteDeps['db'];
  const deps = {
    db,
    logger: createLogger(),
    content: {
      streamText: async () => (async function* () {
        yield 'Evidence-based draft with practical review checklist.';
      })(),
      generateObject: async <T>() => ({ claims: [{ text: 'Review checklist is useful', claimType: 'opinion', riskLevel: 'low' }] }) as T,
    },
    email: {
      buildReplyToAddress: () => 'reply@desk.dev',
      sendEmail: async () => ({ messageId: 'email-1' }),
      sendMagicLink: async () => ({ messageId: 'magic-1' }),
    },
  } as RouteDeps;
  const app = new Hono();
  app.use('*', async (context, next) => {
    (context as { set: (key: string, value: unknown) => void }).set('authUser', { userId: 'u1', companyId: 'c1', role: 'owner' });
    await next();
  });
  app.onError((error, context) => toErrorResponse(context, error));
  app.route('/topics', buildTopicRoutes(deps));
  app.route('/drafts', buildDraftRoutes(deps));
  app.route('/approvals', buildApprovalsRoutes(deps));
  app.route('/docs', buildDocsRoutes(deps));
  return { app, state };
};

describe('critical cycle integration', () => {
  it('runs topic to draft to approved public-doc API cycle', async () => {
    process.env.DEV_DISABLE_AUTH = '1';
    process.env.DEV_AUTH_USER_ID = 'u1';
    process.env.DEV_AUTH_COMPANY_ID = 'c1';
    const { app, state } = createApiHarness();

    const topicResponse = await app.request('http://local/topics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Patient prep checklist', expert_id: 'e1' }),
    });
    const topic = await topicResponse.json();
    expect(topicResponse.status).toBe(201);
    expect(topic).toMatchObject({ id: 'topic-1', status: 'proposed' });

    const earlyDraftResponse = await app.request('http://local/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic_id: topic.id }),
    });
    expect(earlyDraftResponse.status).toBe(400);
    await expect(earlyDraftResponse.json()).resolves.toMatchObject({ error: { code: 'INVALID_STATE' } });

    const approveTopicResponse = await app.request(`http://local/topics/${topic.id}/approve`, { method: 'POST' });
    await expect(approveTopicResponse.json()).resolves.toMatchObject({ id: topic.id, status: 'approved' });

    const draftResponse = await app.request('http://local/drafts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic_id: topic.id }),
    });
    const draft = await draftResponse.json();
    expect(draftResponse.status).toBe(201);
    expect(draft).toMatchObject({ id: 'draft-1', topic_id: topic.id, expert_id: 'e1', status: 'drafting' });
    expect(state.drafts[0]).toMatchObject({ id: 'draft-1', status: 'factcheck', currentVersionId: 'version-1' });

    const factcheckResponse = await app.request(`http://local/drafts/${draft.id}/factcheck`, { method: 'POST' });
    await factcheckResponse.text();
    expect(state.reports[0]).toMatchObject({ id: 'report-1', status: 'completed', draftVersionId: 'version-1' });
    expect(state.drafts[0]).toMatchObject({ status: 'needs_review' });

    const reviewResponse = await app.request(`http://local/drafts/${draft.id}/send-for-review`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ flow_type: 'parallel', deadline_hours: 24, steps: [{ approver_type: 'user', approver_id: 'u1' }] }),
    });
    const review = await reviewResponse.json();
    expect(review).toMatchObject({ approval_flow_id: 'flow-1', status: 'active', notifications_sent: 1 });
    expect(state.steps[0]).toMatchObject({ id: 'step-1', status: 'pending', approvalFlowId: 'flow-1' });

    const decisionResponse = await app.request('http://local/approvals/step-1/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'approve', expected_current_version_id: 'version-1' }),
    });
    await expect(decisionResponse.json()).resolves.toMatchObject({
      draft: { id: 'draft-1', status: 'approved', current_version_id: 'version-1' },
      approval_flow: { id: 'flow-1', status: 'completed' },
    });

    state.notifications.unshift({
      id: 'public-doc-1',
      companyId: 'c1',
      magicLinkToken: 'public-token',
      magicLinkExpiresAt: new Date(Date.now() + 3600_000),
      magicLinkRevoked: false,
      referenceId: 'version-1',
    });
    const publicDocResponse = await app.request('http://local/docs/draft-1?token=public-token');
    await expect(publicDocResponse.json()).resolves.toMatchObject({
      id: 'draft-1',
      status: 'approved',
      topic: { id: 'topic-1', title: 'Patient prep checklist' },
      expert: { id: 'e1', name: 'Dr Expert' },
      current_version: { id: 'version-1', version_number: 1 },
      read_only: true,
    });
  });

  it('builds voice profile and scores generated sample', () => {
    const profile = buildVoiceProfile(['calm structured recommendations', 'clear steps for non-technical readers']);
    const sample = generateVoiceTest(profile);
    const score = calculateVoiceScore(profile, sample);

    expect(sample.length).toBeGreaterThan(50);
    expect(score).toBeGreaterThan(0);
  });

  it('runs factcheck flow with extraction, verification, and report build', async () => {
    const content: ContentPort = {
      streamText: async () => ({
        async *[Symbol.asyncIterator]() {
          yield '';
        },
      }),
      generateObject: async () => ({ claims: [{ text: '22% growth', claimType: 'statistic', riskLevel: 'high' }], ok: true }) as never,
    };

    const claims = await extractClaims('Article says 22% growth and gives no source.', content);
    const verdicts = await verifyHighRiskClaims(claims, content);
    const report = buildReport('dv-1', claims, verdicts, 'medical');

    expect(claims.length).toBeGreaterThan(0);
    expect(report.results.length).toBe(claims.length);
    expect(report.disclaimerType).toBe('medical');
  });

  it('blocks stale approval decisions in end-to-end decision path', async () => {
    const db = dbQueue([
      [{ id: 'step-1', status: 'pending', approvalFlowId: 'flow-1' }],
      [{ id: 'flow-1', draftId: 'draft-1' }],
      [{ id: 'draft-1', currentVersionId: 'v-2' }],
    ]);

    await expect(recordDecision(db, 'step-1', 'v-1', 'approved')).rejects.toMatchObject({ code: 'STALE_VERSION' });
  });
});
