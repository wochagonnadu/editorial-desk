// PATH: apps/web/src/components/calendar/CalendarHeader.tsx
// WHAT: Header with week/month view toggle for calendar page
// WHY:  Keeps CalendarPage smaller and focused on data orchestration
// RELEVANT: apps/web/src/pages/CalendarPage.tsx,apps/web/src/components/calendar/CalendarFilters.tsx

interface CalendarHeaderProps {
  view: 'week' | 'month';
  onChangeView: (next: 'week' | 'month') => void;
}

export function CalendarHeader({ view, onChangeView }: CalendarHeaderProps) {
  return (
    <header className="card">
      <h2>Editorial calendar</h2>
      <div className="row">
        <button
          className={view === 'week' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => onChangeView('week')}
        >
          Week
        </button>
        <button
          className={view === 'month' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => onChangeView('month')}
        >
          Month
        </button>
      </div>
    </header>
  );
}
