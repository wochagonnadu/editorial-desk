// PATH: apps/web/src/services/company.ts
// WHAT: Company settings API adapter for workspace context
// WHY:  Keeps /companies/me contract and mapping outside UI layer
// RELEVANT: apps/web/src/pages/Settings.tsx,services/api/src/routes/companies.ts

import { apiRequest } from './api/client';

export type GenerationPolicy = {
  tone: string;
  default_audience: 'general' | 'beginners' | 'practitioners';
  guardrails: {
    must_include: string[];
    avoid: string[];
    banned_phrases: string[];
  };
};

export type CompanySettings = {
  id: string;
  name: string;
  domain: string;
  language: string;
  generation_policy: GenerationPolicy;
};

export type UpdateCompanySettingsInput = {
  name?: string;
  domain?: string;
  language?: string;
  generation_policy?: Partial<GenerationPolicy> & {
    guardrails?: Partial<GenerationPolicy['guardrails']>;
  };
};

export type GenerationPreviewInput = {
  expert_id: string;
  topic_title: string;
  instructions?: string;
};

export type GenerationPreviewResult = {
  sample_markdown: string;
  applied_policy: GenerationPolicy;
  meta: { use_case: 'draft.generate' | 'draft.revise'; prompt_id: string; prompt_version: string };
};

export const fetchCompanySettings = async (token: string): Promise<CompanySettings> => {
  return apiRequest<CompanySettings>('/api/v1/companies/me', { token });
};

export const updateCompanySettings = async (
  token: string,
  input: UpdateCompanySettingsInput,
): Promise<CompanySettings> => {
  return apiRequest<CompanySettings>('/api/v1/companies/me', {
    method: 'PATCH',
    token,
    body: input,
  });
};

export const previewCompanyGeneration = async (
  token: string,
  input: GenerationPreviewInput,
): Promise<GenerationPreviewResult> => {
  return apiRequest<GenerationPreviewResult>('/api/v1/companies/me/generation-preview', {
    method: 'POST',
    token,
    body: input,
  });
};
