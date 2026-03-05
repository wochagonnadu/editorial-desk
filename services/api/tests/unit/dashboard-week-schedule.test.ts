// PATH: services/api/tests/unit/dashboard-week-schedule.test.ts
// WHAT: Unit tests for dashboard week schedule publish-plan mapping
// WHY:  Confirms schedule uses planned publish datetime instead of updatedAt fallback
// RELEVANT: services/api/src/routes/dashboard-queries.ts,services/api/src/providers/db/schema/topic-draft.ts

import { describe, expect, it } from 'vitest';
import { fetchWeekSchedule } from '../../src/routes/dashboard-queries';
import type { RouteDeps } from '../../src/routes/deps';

const queryResult = <T>(rows: T[]) => ({
  then: (resolve: (value: T[]) => unknown) => Promise.resolve(rows).then(resolve),
});

const createDeps = (queue: unknown[][]): RouteDeps => {
  const db = {
    select: () => ({ from: () => ({ where: () => queryResult(queue.shift() ?? []) }) }),
  } as unknown as RouteDeps['db'];
  return { db } as RouteDeps;
};

describe('dashboard week schedule', () => {
  it('returns scheduled date from scheduledPublishAt and exposes publishPlan', async () => {
    const deps = createDeps([
      [
        {
          draftId: 'd1',
          topicId: 't1',
          expertId: 'e1',
          status: 'approved',
          scheduledPublishAt: new Date('2026-03-20T10:00:00.000Z'),
          publishTimezone: 'Europe/Berlin',
        },
      ],
      [{ id: 't1', title: 'Implant myths' }],
      [{ id: 'e1', name: 'Dr. Ada' }],
    ]);

    const rows = await fetchWeekSchedule(deps, 'c1');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      draftId: 'd1',
      scheduledDate: '2026-03-20',
      publishPlan: {
        scheduledPublishAt: '2026-03-20T10:00:00.000Z',
        timezone: 'Europe/Berlin',
        isScheduled: true,
      },
    });
  });
});
