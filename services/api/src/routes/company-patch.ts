// PATH: services/api/src/routes/company-patch.ts
// WHAT: Validation helpers for company settings patch payload
// WHY:  Keeps companies route focused while enforcing stable update contract
// RELEVANT: services/api/src/routes/companies.ts,packages/shared/src/types/company-user.ts

import type { CompanyDomain } from '@newsroom/shared';
import { AppError } from '../core/errors.js';
import { parseGenerationPolicyPatch } from './generation-policy-parse.js';
import type { GenerationPolicyPatch } from './generation-policy.js';

const COMPANY_DOMAINS: CompanyDomain[] = ['medical', 'legal', 'education', 'business'];

const parseOptionalString = (value: unknown, field: string): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} must be non-empty string`);
  }
  return value.trim();
};

export interface CompanyPatchInput {
  name?: string;
  description?: string;
  language?: string;
  domain?: CompanyDomain;
  generationPolicy?: GenerationPolicyPatch;
}

export const parseCompanyPatch = (body: Record<string, unknown>): CompanyPatchInput => {
  const name = parseOptionalString(body.name, 'name');
  const description = parseOptionalString(body.description, 'description');
  const language = parseOptionalString(body.language, 'language');
  const domainRaw = parseOptionalString(body.domain, 'domain');
  const generationPolicy = parseGenerationPolicyPatch(body.generation_policy);
  if (domainRaw && !COMPANY_DOMAINS.includes(domainRaw as CompanyDomain)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'domain must be medical|legal|education|business');
  }
  const patch = {
    name,
    description,
    language,
    domain: domainRaw as CompanyDomain | undefined,
    generationPolicy,
  };
  if (
    !patch.name &&
    !patch.description &&
    !patch.language &&
    !patch.domain &&
    !patch.generationPolicy
  ) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'at least one field is required: name, description, language, domain, generation_policy',
    );
  }
  return patch;
};
