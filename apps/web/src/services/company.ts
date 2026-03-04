// PATH: apps/web/src/services/company.ts
// WHAT: Company settings API adapter for workspace context
// WHY:  Keeps /companies/me contract and mapping outside UI layer
// RELEVANT: apps/web/src/pages/Settings.tsx,services/api/src/routes/companies.ts

import { apiRequest } from './api/client';

export type CompanySettings = {
  id: string;
  name: string;
  domain: string;
  language: string;
};

export type UpdateCompanySettingsInput = {
  name?: string;
  domain?: string;
  language?: string;
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
