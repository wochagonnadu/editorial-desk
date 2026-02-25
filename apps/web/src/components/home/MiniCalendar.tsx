// PATH: apps/web/src/components/home/MiniCalendar.tsx
// WHAT: Мини-календарь недели с переходом к списку по дню
// WHY:  FR-012 — быстрый обзор schedule и переход к конкретному дню
// RELEVANT: apps/web/src/pages/HomePage.tsx,apps/web/src/components/ui/StatusPill.tsx

import type { WeekScheduleItem } from '@newsroom/shared';
import { StatusPill, type DraftStatus } from '../ui/StatusPill';

interface MiniCalendarProps {
  items: WeekScheduleItem[];
}

const byDay = (items: WeekScheduleItem[]): Record<string, WeekScheduleItem[]> =>
  items.reduce<Record<string, WeekScheduleItem[]>>((acc, item) => {
    acc[item.scheduledDate] = [...(acc[item.scheduledDate] ?? []), item];
    return acc;
  }, {});

export function MiniCalendar({ items }: MiniCalendarProps) {
  if (!items.length) {
    return <p>No scheduled items this week.</p>;
  }

  const groups = byDay(items);
  const dates = Object.keys(groups).sort();

  return (
    <section className="card">
      <h3>This Week</h3>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {dates.map((date) => (
          <button
            key={date}
            className="btn-secondary"
            onClick={() =>
              document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            {date.slice(5)}
          </button>
        ))}
      </div>
      <div className="list">
        {dates.map((date) => (
          <article id={`day-${date}`} key={date} className="approval-step">
            <strong>{date}</strong>
            <div className="list" style={{ marginTop: 'var(--space-2)' }}>
              {groups[date].map((item) => (
                <div
                  key={item.draftId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span>{item.title}</span>
                  <StatusPill status={item.status as DraftStatus} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
