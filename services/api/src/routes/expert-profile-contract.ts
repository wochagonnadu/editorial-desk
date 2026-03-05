// PATH: services/api/src/routes/expert-profile-contract.ts
// WHAT: Normalization helpers for expert rich profile write/read contract
// WHY:  Keeps Expert Setup profile shape stable between PATCH and GET
// RELEVANT: services/api/src/routes/experts.ts,apps/web/src/services/experts.ts

const PROFILE_DATA_KEY = 'expert_setup_profile';

export interface ExpertRichProfile {
  role: string;
  tone: { primary: string; secondary: string[] };
  contacts: { email?: string; telegram?: string; website?: string };
  tags: string[];
  sources: string[];
  background: string;
}

const EMPTY_PROFILE: ExpertRichProfile = {
  role: '',
  tone: { primary: '', secondary: [] },
  contacts: {},
  tags: [],
  sources: [],
  background: '',
};

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const text = normalizeText(item);
    const dedupeKey = text.toLowerCase();
    if (!text || seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(text);
  }
  return result;
};

const normalizeWebsite = (value: unknown): string | undefined => {
  const text = normalizeText(value);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
};

export const normalizeExpertRichProfile = (value: unknown): ExpertRichProfile => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...EMPTY_PROFILE };
  const source = value as Record<string, unknown>;
  const tone =
    source.tone && typeof source.tone === 'object' && !Array.isArray(source.tone)
      ? (source.tone as Record<string, unknown>)
      : {};
  const contacts =
    source.contacts && typeof source.contacts === 'object' && !Array.isArray(source.contacts)
      ? (source.contacts as Record<string, unknown>)
      : {};

  const email = normalizeText(contacts.email).toLowerCase();
  const telegram = normalizeText(contacts.telegram);
  const website = normalizeWebsite(contacts.website);

  return {
    role: normalizeText(source.role),
    tone: {
      primary: normalizeText(tone.primary),
      secondary: normalizeList(tone.secondary),
    },
    contacts: {
      ...(email ? { email } : {}),
      ...(telegram ? { telegram } : {}),
      ...(website ? { website } : {}),
    },
    tags: normalizeList(source.tags),
    sources: normalizeList(source.sources),
    background: normalizeText(source.background),
  };
};

export const readExpertRichProfile = (profileData: Record<string, unknown>): ExpertRichProfile => {
  return normalizeExpertRichProfile(profileData[PROFILE_DATA_KEY]);
};

export const mergeExpertRichProfile = (
  profileData: Record<string, unknown>,
  profile: ExpertRichProfile,
): Record<string, unknown> => ({
  ...profileData,
  [PROFILE_DATA_KEY]: profile,
});
