// PATH: services/api/tests/unit/factcheck.test.ts
// WHAT: Unit tests for claim extraction and factcheck report helpers
// WHY:  Keeps safety pipeline stable when provider behavior changes
// RELEVANT: services/api/src/core/factcheck.ts,packages/shared/src/ports/content-port.ts

import type { ContentPort } from '@newsroom/shared';
import { buildReport, extractClaims } from '../../src/core/factcheck';

const contentMock = (
  generateObjectImpl: (_input: unknown) => Promise<unknown>,
): ContentPort => ({
  streamText: async () => ({
    async *[Symbol.asyncIterator]() {
      yield '';
    },
  }),
  generateObject: <T>(input: unknown) => generateObjectImpl(input) as Promise<T>,
});

describe('factcheck core', () => {
  it('uses model response when claims are returned', async () => {
    const content = contentMock(async () => ({ claims: [{ text: 'Claim', claimType: 'factual', riskLevel: 'medium' }] }));
    const claims = await extractClaims('Some body text with one claim.', content);
    expect(claims).toHaveLength(1);
    expect(claims[0]?.text).toBe('Claim');
  });

  it('falls back to deterministic extraction when model fails', async () => {
    const content = contentMock(async () => { throw new Error('provider down'); });
    const claims = await extractClaims('Data shows 22% growth. Another long factual sentence is present.', content);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.some((item) => item.riskLevel === 'high')).toBe(true);
  });

  it('builds report with disclaimer and aggregated risk', () => {
    const report = buildReport('dv-1', [{ text: 'A', claimType: 'factual', riskLevel: 'high' }], [], 'medical');
    expect(report.status).toBe('completed');
    expect(report.disclaimerType).toBe('medical');
    expect(report.overallRiskScore).toBe(1);
  });
});
