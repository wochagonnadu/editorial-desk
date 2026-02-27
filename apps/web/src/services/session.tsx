// PATH: apps/web/src/services/session.tsx
// WHAT: Session provider with localStorage persistence for auth
// WHY:  Gives a single source of truth for token/user across web routes
// RELEVANT: apps/web/src/App.tsx,apps/web/src/pages/Login.tsx

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { SessionData } from './auth';

const SESSION_STORAGE_KEY = 'editorialdesk.session';

type SessionContextValue = {
  session: SessionData | null;
  setSession: (value: SessionData) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const readStoredSession = (): SessionData | null => {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<SessionData | null>(readStoredSession);

  const setSession = useCallback((value: SessionData) => {
    setSessionState(value);
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ session, setSession, clearSession }),
    [session, setSession, clearSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
};
