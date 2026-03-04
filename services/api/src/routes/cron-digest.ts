// PATH: services/api/src/routes/cron-digest.ts
// WHAT: Digest cron handler for monthly owner report delivery
// WHY:  Keeps digest flow isolated from daily reminder dispatcher
// RELEVANT: services/api/src/routes/cron.ts,services/api/src/core/reports.ts

import { and, eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { monthRange } from '../core/reports.js';
import { digestJobKey } from '../worker/job-key.js';
import { companyTable, userTable } from '../providers/db/index.js';
import { enqueueJob, runQueuedJobs } from './cron-worker.js';
import type { RouteDeps } from './deps.js';

const currentPeriod = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

export const buildDigestCronHandler =
  (deps: RouteDeps, assertCronSecret: (authorization: string | undefined) => void) =>
  async (context: Context) => {
    assertCronSecret(context.req.header('authorization'));
    const period = context.req.query('month') ?? currentPeriod();
    monthRange(period);

    const companies = await deps.db.select().from(companyTable);

    for (const company of companies) {
      const owners = await deps.db
        .select()
        .from(userTable)
        .where(and(eq(userTable.companyId, company.id), eq(userTable.role, 'owner')));
      for (const owner of owners) {
        enqueueJob(deps, {
          name: 'digest.monthly.send',
          jobKey: digestJobKey(company.id, owner.id, period),
          payload: { companyId: company.id, ownerId: owner.id, period },
          enqueuedAt: new Date().toISOString(),
        });
      }
    }

    const totals = await runQueuedJobs(deps);
    return context.json({ digests_sent: totals.digests_sent ?? 0, period });
  };
