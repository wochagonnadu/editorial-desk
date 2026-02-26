// PATH: apps/web/src/components/calendar/WeekView.tsx
// WHAT: Week calendar grid with clickable draft cards
// WHY:  FR-050 — default weekly planning view with direct editor navigation
// RELEVANT: apps/web/src/pages/CalendarPage.tsx,apps/web/src/components/ui/StatusPill.tsx

import { StatusPill, type DraftStatus } from '../ui/StatusPill';
import type { CalendarEntry } from './types';

interface WeekViewProps {
  weekStart: string; // YYYY-MM-DD
  items: CalendarEntry[];
  onOpenDraft: (draftId: string) => void;
}

const addDays = (date: string, offset: number): string => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + offset);
  return next.toISOString().slice(0, 10);
};

export function WeekView({ weekStart, items, onOpenDraft }: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const dayLabel = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short' });

  return (
    <section className="approvals-list">
      <h3 style={{ margin: 0 }}>Week view</h3>
      <div className="calendar-week-grid">
        {days.map((day) => {
          const dayItems = items.filter((item) => item.scheduledDate === day);
          return (
            <article className="calendar-day" key={day}>
              <small>{dayLabel(day)}</small>
              <strong>{day.slice(5)}</strong>
              <div className="list">
                {dayItems.map((item) => (
                  <button
                    key={item.draftId}
                    className="calendar-entry"
                    onClick={() => onOpenDraft(item.draftId)}
                  >
                    <span>{item.title}</span>
                    <small>{item.expertName}</small>
                    <StatusPill status={item.status as DraftStatus} />
                  </button>
                ))}
                {dayItems.length === 0 ? <small>No items</small> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
