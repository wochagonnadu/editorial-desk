// PATH: services/api/src/worker/jobs/approval-overdue-helpers.ts
// WHAT: Small DB/email helpers for approval overdue worker job
// WHY:  Keeps job handler focused and under file-size limits
// RELEVANT: services/api/src/worker/jobs/approval-overdue.ts,services/api/src/providers/db/schema/approval.ts

import { eq } from 'drizzle-orm';
import { expertTable, userTable } from '../../providers/db/index.js';
import type { WorkerRuntimeDeps } from '../bootstrap.js';

export const approverEmail = async (
  deps: WorkerRuntimeDeps,
  approverType: string,
  approverId: string,
) => {
  if (approverType === 'user') {
    const [user] = await deps.db
      .select()
      .from(userTable)
      .where(eq(userTable.id, approverId))
      .limit(1);
    return user?.email ?? null;
  }
  const [expert] = await deps.db
    .select()
    .from(expertTable)
    .where(eq(expertTable.id, approverId))
    .limit(1);
  return expert?.email ?? null;
};

export const findUserEmail = async (deps: WorkerRuntimeDeps, userId: string) => {
  const [user] = await deps.db.select().from(userTable).where(eq(userTable.id, userId)).limit(1);
  return user?.email ?? null;
};
