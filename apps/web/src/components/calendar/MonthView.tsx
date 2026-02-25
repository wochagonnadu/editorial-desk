// PATH: apps/web/src/components/calendar/MonthView.tsx
// WHAT: Month grid with compact draft indicators per day
// WHY:  FR-050 — broader planning horizon for editorial calendar
// RELEVANT: apps/web/src/pages/CalendarPage.tsx,apps/web/src/components/calendar/types.ts

import type { CalendarEntry } from './types';

interface MonthViewProps {
  monthKey: string; // YYYY-MM
  items: CalendarEntry[];
  onOpenDraft: (draftId: string) => void;
}

const toDate = (input: string) => new Date(`${input}T00:00:00Z`);

export function MonthView({ monthKey, items, onOpenDraft }: MonthViewProps) {
  const first = toDate(`${monthKey}-01`);
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const startOffset = (first.getUTCDay() + 6) % 7;
  const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = [
    ...Array.from({ length: startOffset }, (_, idx) => ({ key: `blank-${idx}`, date: '' })),
    ...Array.from({ length: totalDays }, (_, idx) => {
      const day = String(idx + 1).padStart(2, '0');
      return { key: `${monthKey}-${day}`, date: `${monthKey}-${day}` };
    }),
  ];

  return (
    <section className="card">
      <h3>Month view</h3>
      <div
        className="calendar-month-grid"
        style={{
          display: 'grid',
          gap: 'var(--space-2)',
          gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))',
        }}
      >
        {cells.map((cell) => {
          if (!cell.date)
            return (
              <div
                key={cell.key}
                className="calendar-day calendar-day--blank"
                style={{ minHeight: 90 }}
              />
            );
          const dayItems = items.filter((item) => item.scheduledDate === cell.date);
          return (
            <article
              key={cell.key}
              className="calendar-day"
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2)',
                minHeight: 90,
              }}
            >
              <strong>{cell.date.slice(8)}</strong>
              {dayItems.map((item) => (
                <button
                  key={item.draftId}
                  className="calendar-chip"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    marginTop: 'var(--space-1)',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-alt)',
                  }}
                  onClick={() => onOpenDraft(item.draftId)}
                >
                  {item.title.slice(0, 20)}
                </button>
              ))}
            </article>
          );
        })}
      </div>
    </section>
  );
}
