// PATH: apps/web/src/context/AuthContext.tsx
// WHAT: Auth state container for web dashboard
// WHY:  Shares session token and login actions across pages
// RELEVANT: apps/web/src/services/api.ts,apps/web/src/App.tsx

import { createContext, useContext, useMemo, useState } from 'react';
import { apiClient, type SessionUser } from '../services/api';

interface AuthContextValue {
  token: string | null;
  user: SessionUser | null;
  requestMagicLink(email: string): Promise<string>;
  verifyMagicLink(token: string): Promise<void>;
  logout(): void;
}

const STORAGE_KEY = 'newsroom.session';
const AuthContext = createContext<AuthContextValue | null>(null);
const DEV_BYPASS = (import.meta.env.VITE_DEV_DISABLE_AUTH as string | undefined) === 'true';

const DEV_SESSION: { token: string; user: SessionUser } = {
  token: 'dev-bypass-token',
  user: {
    id:
      (import.meta.env.VITE_DEV_AUTH_USER_ID as string | undefined) ??
      '00000000-0000-0000-0000-000000000001',
    email: (import.meta.env.VITE_DEV_AUTH_EMAIL as string | undefined) ?? 'mail@mail.com',
    role:
      (import.meta.env.VITE_DEV_AUTH_ROLE as string | undefined) === 'manager'
        ? 'manager'
        : 'owner',
    company_id:
      (import.meta.env.VITE_DEV_AUTH_COMPANY_ID as string | undefined) ??
      '00000000-0000-0000-0000-000000000001',
  },
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<{ token: string; user: SessionUser } | null>(() => {
    if (DEV_BYPASS) return DEV_SESSION;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { token: string; user: SessionUser }) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      async requestMagicLink(email) {
        if (DEV_BYPASS) {
          return `DEV auth bypass enabled. Token: ${DEV_SESSION.token}`;
        }
        const result = await apiClient.login(email);
        return result.message;
      },
      async verifyMagicLink(token) {
        if (DEV_BYPASS) {
          setSession(DEV_SESSION);
          return;
        }
        const verified = await apiClient.verify(token);
        const next = { token: verified.token, user: verified.user };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
      },
      logout() {
        if (DEV_BYPASS) {
          setSession(DEV_SESSION);
          return;
        }
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
