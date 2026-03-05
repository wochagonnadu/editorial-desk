// PATH: services/api/src/routes/generation-policy.ts
// WHAT: Types and pure helpers for workspace generation policy defaults/merge
// WHY:  Keeps policy handling deterministic across GET/PATCH and audit metadata
// RELEVANT: services/api/src/routes/company-patch.ts,services/api/src/routes/companies.ts

type GenerationAudience = 'general' | 'beginners' | 'practitioners';
type GenerationGuardrails = { must_include: string[]; avoid: string[]; banned_phrases: string[] };
export type GenerationPolicy = {
  tone: string;
  default_audience: GenerationAudience;
  guardrails: GenerationGuardrails;
};
export type GenerationPolicyPatch = {
  tone?: string;
  default_audience?: GenerationAudience;
  guardrails?: Partial<GenerationGuardrails>;
};

const AUDIENCES = new Set<GenerationAudience>(['general', 'beginners', 'practitioners']);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const clonePolicy = (value: GenerationPolicy): GenerationPolicy => ({
  tone: value.tone,
  default_audience: value.default_audience,
  guardrails: {
    must_include: [...value.guardrails.must_include],
    avoid: [...value.guardrails.avoid],
    banned_phrases: [...value.guardrails.banned_phrases],
  },
});

export const GENERATION_POLICY_DEFAULTS: GenerationPolicy = {
  tone: 'clear, calm, practical',
  default_audience: 'general',
  guardrails: {
    must_include: ['actionable advice'],
    avoid: ['hype wording'],
    banned_phrases: ['100% guaranteed'],
  },
};

const normalizeList = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return [...fallback];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 80)
    .slice(0, 12);
};

export const normalizeGenerationPolicy = (value: unknown): GenerationPolicy => {
  const fallback = GENERATION_POLICY_DEFAULTS;
  if (!isRecord(value)) return clonePolicy(fallback);
  const guardrails = isRecord(value.guardrails) ? value.guardrails : {};
  return {
    tone:
      typeof value.tone === 'string' &&
      value.tone.trim().length >= 10 &&
      value.tone.trim().length <= 240
        ? value.tone.trim()
        : fallback.tone,
    default_audience:
      typeof value.default_audience === 'string' &&
      AUDIENCES.has(value.default_audience as GenerationAudience)
        ? (value.default_audience as GenerationAudience)
        : fallback.default_audience,
    guardrails: {
      must_include: normalizeList(guardrails.must_include, fallback.guardrails.must_include),
      avoid: normalizeList(guardrails.avoid, fallback.guardrails.avoid),
      banned_phrases: normalizeList(guardrails.banned_phrases, fallback.guardrails.banned_phrases),
    },
  };
};

export const applyGenerationPolicyPatch = (
  current: GenerationPolicy,
  patch: GenerationPolicyPatch,
): GenerationPolicy => ({
  tone: patch.tone ?? current.tone,
  default_audience: patch.default_audience ?? current.default_audience,
  guardrails: {
    must_include: patch.guardrails?.must_include ?? current.guardrails.must_include,
    avoid: patch.guardrails?.avoid ?? current.guardrails.avoid,
    banned_phrases: patch.guardrails?.banned_phrases ?? current.guardrails.banned_phrases,
  },
});

export const generationPolicyChangedSections = (patch: GenerationPolicyPatch): string[] => {
  const sections: string[] = [];
  if (patch.tone !== undefined) sections.push('tone');
  if (patch.default_audience !== undefined) sections.push('default_audience');
  if (patch.guardrails?.must_include !== undefined) sections.push('guardrails.must_include');
  if (patch.guardrails?.avoid !== undefined) sections.push('guardrails.avoid');
  if (patch.guardrails?.banned_phrases !== undefined) sections.push('guardrails.banned_phrases');
  return sections;
};
