// PATH: services/api/tests/integration/content-cycle.test.ts
// WHAT: Integration tests for critical content lifecycle flows
// WHY:  Verifies key MVP scenario from onboarding to approval safety
// RELEVANT: services/api/src/core/voice.ts,services/api/src/core/factcheck.ts,services/api/src/core/approval.ts

import type { ContentPort } from '@newsroom/shared';
import { recordDecision } from '../../src/core/approval';
import { buildReport, extractClaims, verifyHighRiskClaims } from '../../src/core/factcheck';
import { buildVoiceProfile, calculateVoiceScore, generateVoiceTest } from '../../src/core/voice';

const dbQueue = (queue: unknown[]) => ({
  select: () => ({ from: () => ({ where: () => ({ limit: async () => (queue.shift() as unknown[]) ?? [] }) }) }),
  insert: () => ({ values: () => ({ returning: async () => [{ id: 'decision-1' }] }) }),
  update: () => ({ set: () => ({ where: async () => undefined }) }),
}) as unknown as Parameters<typeof recordDecision>[0];

describe('critical cycle integration', () => {
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
