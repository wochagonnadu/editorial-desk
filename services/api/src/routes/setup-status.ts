// PATH: services/api/src/routes/setup-status.ts
// WHAT: Shared setup completion helpers for user and company routes
// WHY:  Keeps first-run setup marker rules consistent across write paths
// RELEVANT: services/api/src/routes/companies.ts,services/api/src/routes/users.ts,services/api/src/providers/db/schema/company-user.ts

type SetupSnapshot = {
  managerName?: string | null;
  companyName?: string | null;
  companyDomain?: string | null;
  companyDescription?: string | null;
  setupCompletedAt?: Date | null;
};

const hasValue = (value: string | null | undefined) =>
  typeof value === 'string' && value.trim() !== '';

export const hasCompletedManagerSetup = (snapshot: SetupSnapshot): boolean => {
  return [
    snapshot.managerName,
    snapshot.companyName,
    snapshot.companyDomain,
    snapshot.companyDescription,
  ].every(hasValue);
};

export const resolveSetupCompletedAt = (
  snapshot: SetupSnapshot,
  now = new Date(),
): Date | undefined => {
  if (snapshot.setupCompletedAt) return snapshot.setupCompletedAt;
  return hasCompletedManagerSetup(snapshot) ? now : undefined;
};
