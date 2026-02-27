// PATH: apps/web/src/pages/Logout.tsx
// WHAT: Clears auth session and redirects user to login
// WHY:  Provides predictable logout flow from app sidebar
// RELEVANT: apps/web/src/components/AppShell.tsx,apps/web/src/services/session.tsx

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../services/session';

export function Logout() {
  const navigate = useNavigate();
  const { clearSession } = useSession();

  useEffect(() => {
    clearSession();
    navigate('/login', { replace: true });
  }, [clearSession, navigate]);

  return null;
}
