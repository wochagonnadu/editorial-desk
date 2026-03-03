// PATH: services/api/src/core/config.ts
// WHAT: Minimal runtime config helpers for API feature flags
// WHY:  Keeps env-driven behavior explicit and centralized for safe rollbacks
// RELEVANT: services/api/src/routes/auth.ts,.env.example,specs/007-vercel-auth-json-body-recovery/tasks.md

const isTrue = (value: string | undefined): boolean => {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const isAuthLoginQueryFallbackEnabled = (): boolean =>
  isTrue(process.env.AUTH_LOGIN_ALLOW_QUERY_EMAIL_FALLBACK);
