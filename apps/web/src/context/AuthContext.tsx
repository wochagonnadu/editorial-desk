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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<{ token: string; user: SessionUser } | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as { token: string; user: SessionUser }) : null;
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      async requestMagicLink(email) {
        const result = await apiClient.login(email);
        return result.message;
      },
      async verifyMagicLink(token) {
        const verified = await apiClient.verify(token);
        const next = { token: verified.token, user: verified.user };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setSession(next);
      },
      logout() {
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
