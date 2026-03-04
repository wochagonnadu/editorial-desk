// PATH: services/api/src/routes/company-patch.ts
// WHAT: Validation helpers for company settings patch payload
// WHY:  Keeps companies route focused while enforcing stable update contract
// RELEVANT: services/api/src/routes/companies.ts,packages/shared/src/types/company-user.ts

import type { CompanyDomain } from '@newsroom/shared';
import { AppError } from '../core/errors.js';

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
  language?: string;
  domain?: CompanyDomain;
}

export const parseCompanyPatch = (body: Record<string, unknown>): CompanyPatchInput => {
  const name = parseOptionalString(body.name, 'name');
  const language = parseOptionalString(body.language, 'language');
  const domainRaw = parseOptionalString(body.domain, 'domain');
  if (domainRaw && !COMPANY_DOMAINS.includes(domainRaw as CompanyDomain)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'domain must be medical|legal|education|business');
  }
  const patch = { name, language, domain: domainRaw as CompanyDomain | undefined };
  if (!patch.name && !patch.language && !patch.domain) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'at least one field is required: name, language, domain',
    );
  }
  return patch;
};
