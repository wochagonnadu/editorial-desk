// PATH: services/api/src/routes/user-profile-contract.ts
// WHAT: Parsing and mapping helpers for user profile and setup status responses
// WHY:  Keeps user routes small while exposing setup-ready contracts for web
// RELEVANT: services/api/src/routes/users.ts,services/api/src/routes/setup-status.ts,services/api/src/providers/db/schema/company-user.ts

import { AppError } from '../core/errors.js';
import { companyTable, userTable } from '../providers/db/index.js';

type UserRow = typeof userTable.$inferSelect;
type CompanyRow = typeof companyTable.$inferSelect;

export const mapUserProfileResponse = (user: UserRow) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
});

export const mapSetupStatusResponse = (company: CompanyRow) => ({
  setup_completed_at: company.setupCompletedAt,
  setup_required: !company.setupCompletedAt,
});

export const parseUserProfilePatch = (body: Record<string, unknown>) => {
  const name = body.name;
  if (typeof name !== 'string' || name.trim() === '') {
    throw new AppError(400, 'VALIDATION_ERROR', 'name must be non-empty string');
  }
  return { name: name.trim() };
};
