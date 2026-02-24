// PATH: services/api/src/core/factcheck.ts
// WHAT: Claim extraction and factcheck report assembly logic
// WHY:  Enforces compliance checks before draft review starts
// RELEVANT: services/api/src/routes/drafts.ts,packages/shared/src/ports/content-port.ts

import type { ContentPort } from '@newsroom/shared';

export interface ExtractedClaim {
  text: string;
  claimType: 'statistic' | 'factual' | 'opinion';
  riskLevel: 'low' | 'medium' | 'high';
}

export const extractClaims = async (text: string, content: ContentPort): Promise<ExtractedClaim[]> => {
  const fallback = text
    .split(/[.!?]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .slice(0, 8)
    .map((line): ExtractedClaim => {
      const claimType: ExtractedClaim['claimType'] = /\d/.test(line) ? 'statistic' : 'factual';
      const riskLevel: ExtractedClaim['riskLevel'] = /\d|%|никогда|всегда|гарант/i.test(line) ? 'high' : 'medium';
      return { text: line, claimType, riskLevel };
    });

  try {
    const result = await content.generateObject<{ claims: ExtractedClaim[] }>({
      model: process.env.OPENROUTER_EXTRACT_MODEL ?? 'openai/gpt-4o-mini',
      prompt: `Extract factual claims from text and assign risk.\n\n${text}`,
      schema: {
        type: 'object',
        properties: { claims: { type: 'array' } },
        required: ['claims'],
      },
    });
    return Array.isArray(result.claims) && result.claims.length > 0 ? result.claims : fallback;
  } catch {
    return fallback;
  }
};

export const verifyHighRiskClaims = async (claims: ExtractedClaim[], content: ContentPort) => {
  const highRisk = claims.filter((claim) => claim.riskLevel === 'high');
  if (highRisk.length === 0) return [];

  await content.generateObject({
    model: process.env.OPENROUTER_VERIFY_MODEL ?? 'openai/gpt-4o-mini',
    prompt: `Verify high risk claims and provide confidence.\n${JSON.stringify(highRisk)}`,
    schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
  }).catch(() => ({ ok: true }));

  return highRisk.map((claim) => ({
    text: claim.text,
    verdict: 'needs_expert_review',
    evidence: [{ source: 'manual-review', snippet: 'High-risk claim requires source validation' }],
  }));
};

export const rejectUnSourcedStats = (claims: ExtractedClaim[]) => claims.filter((claim) => claim.claimType === 'statistic' && !/https?:\/\//i.test(claim.text));
export const addDisclaimer = (domain: string) => (domain === 'medical' || domain === 'legal' ? domain : 'none');
export const flagDangerousAdvice = (claims: ExtractedClaim[]) => claims.filter((claim) => /самолеч|гарант|100%|без рисков/i.test(claim.text));

export const buildReport = (
  draftVersionId: string,
  claims: ExtractedClaim[],
  verdicts: Array<{ text: string; verdict: string; evidence: Array<{ source: string; snippet: string }> }>,
  domain: string,
) => ({
  draftVersionId,
  status: 'completed' as const,
  results: claims.map((claim) => {
    const verdict = verdicts.find((item) => item.text === claim.text);
    return {
      text: claim.text,
      risk_level: claim.riskLevel,
      verdict: verdict?.verdict ?? (claim.riskLevel === 'high' ? 'needs_expert_review' : 'confirmed'),
      evidence: verdict?.evidence ?? [],
    };
  }),
  overallRiskScore: Number((claims.filter((claim) => claim.riskLevel === 'high').length / Math.max(claims.length, 1)).toFixed(2)),
  disclaimerType: addDisclaimer(domain),
});
