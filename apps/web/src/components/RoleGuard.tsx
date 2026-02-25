// PATH: apps/web/src/components/RoleGuard.tsx
// WHAT: Ограничивает доступ к маршруту по роли пользователя
// WHY:  FR-002 — owners видят Settings; managers нет; experts видят только свои (TBD)
// RELEVANT: apps/web/src/App.tsx, apps/web/src/context/AuthContext.tsx

import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

type Role = 'owner' | 'manager';

interface Props {
  /** Роли, которым разрешён доступ */
  allow: Role[];
  /** Что показать если доступ запрещён */
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({ allow, fallback, children }: Props) {
  const { user } = useAuth();

  if (!user) return null;
  if (!allow.includes(user.role)) {
    return <>{fallback ?? <p>Access restricted</p>}</>;
  }
  return <>{children}</>;
}
