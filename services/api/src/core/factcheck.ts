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

interface ExtractedClaimV2 {
  claim_text?: string;
  claim_type?: string;
  risk_level?: string;
}

interface VerifyVerdict {
  id?: string;
  verdict?: 'supported' | 'unsupported' | 'needs_expert_review';
  reason?: string;
  safe_rewrite?: string;
  sources?: Array<{ title?: string; url?: string; snippet?: string }>;
}

const toClaimType = (value: unknown): ExtractedClaim['claimType'] => {
  const v = String(value ?? '').toLowerCase();
  if (v === 'statistic') return 'statistic';
  if (v === 'opinion') return 'opinion';
  return 'factual';
};

const toRiskLevel = (value: unknown): ExtractedClaim['riskLevel'] => {
  const v = String(value ?? '').toLowerCase();
  if (v === 'low') return 'low';
  if (v === 'high') return 'high';
  return 'medium';
};

const normalizeClaims = (claims: unknown[]): ExtractedClaim[] => {
  return claims
    .map((raw) => {
      const old = raw as Partial<ExtractedClaim>;
      const modern = raw as ExtractedClaimV2;
      const text = String(old.text ?? modern.claim_text ?? '').trim();
      if (!text) return null;
      return {
        text,
        claimType: toClaimType(old.claimType ?? modern.claim_type),
        riskLevel: toRiskLevel(old.riskLevel ?? modern.risk_level),
      };
    })
    .filter((item): item is ExtractedClaim => Boolean(item));
};

export const extractClaims = async (
  text: string,
  content: ContentPort,
): Promise<ExtractedClaim[]> => {
  const fallback = text
    .split(/[.!?]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .slice(0, 8)
    .map((line): ExtractedClaim => {
      const claimType: ExtractedClaim['claimType'] = /\d/.test(line) ? 'statistic' : 'factual';
      const riskLevel: ExtractedClaim['riskLevel'] = /\d|%|никогда|всегда|гарант/i.test(line)
        ? 'high'
        : 'medium';
      return { text: line, claimType, riskLevel };
    });

  try {
    const result = await content.generateObject<{ claims: ExtractedClaim[] }>({
      meta: {
        useCase: 'factcheck.extract',
        promptId: 'factcheck.extract.claims',
        promptVersion: '1.0.0',
      },
      promptVars: {
        draft_content: text,
      },
      schema: {
        type: 'object',
        properties: { claims: { type: 'array' } },
        required: ['claims'],
      },
    });
    const normalized = Array.isArray(result.claims) ? normalizeClaims(result.claims) : [];
    return normalized.length > 0 ? normalized : fallback;
  } catch {
    return fallback;
  }
};

export const verifyHighRiskClaims = async (claims: ExtractedClaim[], content: ContentPort) => {
  const highRisk = claims.filter((claim) => claim.riskLevel === 'high');
  if (highRisk.length === 0) return [];

  const result = await content
    .generateObject({
      meta: {
        useCase: 'factcheck.verify',
        promptId: 'factcheck.verify.high_risk',
        promptVersion: '1.0.0',
      },
      promptVars: {
        claims_json: JSON.stringify(highRisk),
      },
      schema: {
        type: 'object',
        properties: {
          verdicts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                verdict: { type: 'string' },
                reason: { type: 'string' },
                safe_rewrite: { type: 'string' },
                sources: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      url: { type: 'string' },
                      snippet: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        required: ['verdicts'],
      },
    })
    .catch(() => ({ verdicts: [] as VerifyVerdict[] }));

  const verdicts = Array.isArray((result as { verdicts?: unknown }).verdicts)
    ? ((result as { verdicts: VerifyVerdict[] }).verdicts ?? [])
    : [];

  return highRisk.map((claim, index) => {
    const verdict = verdicts[index];
    const sourceEvidence = Array.isArray(verdict?.sources)
      ? verdict.sources
          .filter((source) => typeof source?.url === 'string' && source.url.startsWith('http'))
          .map((source) => ({
            source: source.title || source.url || 'model-source',
            snippet: source.snippet || verdict?.reason || 'Source provided by verifier',
            url: source.url,
          }))
      : [];
    return {
      text: claim.text,
      verdict: verdict?.verdict ?? 'needs_expert_review',
      evidence:
        sourceEvidence.length > 0
          ? sourceEvidence
          : [{ source: 'manual-review', snippet: 'High-risk claim requires source validation' }],
    };
  });
};

export const rejectUnSourcedStats = (claims: ExtractedClaim[]) =>
  claims.filter((claim) => claim.claimType === 'statistic' && !/https?:\/\//i.test(claim.text));
export const addDisclaimer = (domain: string) =>
  domain === 'medical' || domain === 'legal' ? domain : 'none';
export const flagDangerousAdvice = (claims: ExtractedClaim[]) =>
  claims.filter((claim) => /самолеч|гарант|100%|без рисков/i.test(claim.text));

export const buildReport = (
  draftVersionId: string,
  claims: ExtractedClaim[],
  verdicts: Array<{
    text: string;
    verdict: string;
    evidence: Array<{ source: string; snippet: string }>;
  }>,
  domain: string,
) => ({
  draftVersionId,
  status: 'completed' as const,
  results: claims.map((claim) => {
    const verdict = verdicts.find((item) => item.text === claim.text);
    return {
      text: claim.text,
      risk_level: claim.riskLevel,
      verdict:
        verdict?.verdict ?? (claim.riskLevel === 'high' ? 'needs_expert_review' : 'confirmed'),
      evidence: verdict?.evidence ?? [],
    };
  }),
  overallRiskScore: Number(
    (
      claims.filter((claim) => claim.riskLevel === 'high').length / Math.max(claims.length, 1)
    ).toFixed(2),
  ),
  disclaimerType: addDisclaimer(domain),
});
