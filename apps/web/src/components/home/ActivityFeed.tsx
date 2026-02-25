// PATH: apps/web/src/components/home/ActivityFeed.tsx
// WHAT: Лента недавних событий редакционного процесса
// WHY:  FR-014 — менеджер видит что поменялось без переходов по страницам
// RELEVANT: apps/web/src/pages/HomePage.tsx,services/api/src/routes/dashboard-queries-pulse.ts

import type { ActivityEvent } from '@newsroom/shared';

interface ActivityFeedProps {
  items: ActivityEvent[];
}

const isQuietWeek = (items: ActivityEvent[]): boolean => {
  if (!items.length) return true;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(items[0].createdAt).getTime() > sevenDaysMs;
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (isQuietWeek(items)) {
    return (
      <section className="card">
        <h3>Activity Feed</h3>
        <p>Quiet week. No recent activity in the last 7 days.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3>Activity Feed</h3>
      <div className="list">
        {items.map((item) => (
          <article key={item.id} className="audit-row">
            <strong>{item.action}</strong>
            <div>
              <small>
                {item.actor} · {item.target} · {new Date(item.createdAt).toLocaleString()}
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
