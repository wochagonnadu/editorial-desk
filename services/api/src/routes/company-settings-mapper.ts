// PATH: services/api/src/routes/company-settings-mapper.ts
// WHAT: Mapper helpers for company settings response, update values, and audit metadata
// WHY:  Keeps companies route focused on flow while policy details stay reusable
// RELEVANT: services/api/src/routes/companies.ts,services/api/src/routes/company-patch.ts

import { companyTable } from '../providers/db/index.js';
import type { CompanyPatchInput } from './company-patch.js';
import {
  applyGenerationPolicyPatch,
  generationPolicyChangedSections,
  normalizeGenerationPolicy,
} from './generation-policy.js';
import { resolveSetupCompletedAt } from './setup-status.js';

type CompanyRow = typeof companyTable.$inferSelect;
type CompanyInsert = typeof companyTable.$inferInsert;

export const mapCompanySettingsResponse = (company: CompanyRow) => ({
  id: company.id,
  name: company.name,
  domain: company.domain,
  description: company.description,
  language: company.language,
  generation_policy: normalizeGenerationPolicy(company.generationPolicy),
  setup_completed_at: company.setupCompletedAt,
});

export const buildCompanyUpdateFromPatch = (
  company: CompanyRow,
  patch: CompanyPatchInput,
  managerName?: string | null,
) => {
  const updateValues: Partial<CompanyInsert> = { updatedAt: new Date() };
  if (patch.name !== undefined) updateValues.name = patch.name;
  if (patch.description !== undefined) updateValues.description = patch.description;
  if (patch.language !== undefined) updateValues.language = patch.language;
  if (patch.domain !== undefined) updateValues.domain = patch.domain;
  if (patch.generationPolicy) {
    const currentPolicy = normalizeGenerationPolicy(company.generationPolicy);
    updateValues.generationPolicy = applyGenerationPolicyPatch(
      currentPolicy,
      patch.generationPolicy,
    );
  }

  const setupCompletedAt = resolveSetupCompletedAt({
    managerName,
    companyName: patch.name ?? company.name,
    companyDomain: patch.domain ?? company.domain,
    companyDescription: patch.description ?? company.description,
    setupCompletedAt: company.setupCompletedAt,
  });
  if (setupCompletedAt) updateValues.setupCompletedAt = setupCompletedAt;

  const changedFields: string[] = [];
  if (patch.name !== undefined) changedFields.push('name');
  if (patch.description !== undefined) changedFields.push('description');
  if (patch.language !== undefined) changedFields.push('language');
  if (patch.domain !== undefined) changedFields.push('domain');
  if (patch.generationPolicy) changedFields.push('generation_policy');
  if (company.setupCompletedAt !== setupCompletedAt && setupCompletedAt) {
    changedFields.push('setup_completed_at');
  }

  const policySections = patch.generationPolicy
    ? generationPolicyChangedSections(patch.generationPolicy)
    : [];

  return { updateValues, changedFields, policySections };
};
