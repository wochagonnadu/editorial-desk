// PATH: apps/web/src/components/RequireAuth.tsx
// WHAT: Route guard for private /app pages based on session state
// WHY:  Prevents entering protected routes without a valid token
// RELEVANT: apps/web/src/App.tsx,apps/web/src/services/session.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../services/session';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const location = useLocation();

  if (!session) {
    const fromPath = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from: fromPath }} />;
  }

  return <>{children}</>;
}
