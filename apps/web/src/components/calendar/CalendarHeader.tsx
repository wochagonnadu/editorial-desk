// PATH: apps/web/src/components/calendar/CalendarHeader.tsx
// WHAT: Header with week/month view toggle for calendar page
// WHY:  Keeps CalendarPage smaller and focused on data orchestration
// RELEVANT: apps/web/src/pages/CalendarPage.tsx,apps/web/src/components/calendar/CalendarFilters.tsx

interface CalendarHeaderProps {
  view: 'week' | 'month';
  periodLabel: string;
  onChangeView: (next: 'week' | 'month') => void;
  onPrevious: () => void;
  onNext: () => void;
  onCreateDraft: () => void;
}

export function CalendarHeader(props: CalendarHeaderProps) {
  return (
    <header className="card approvals-header">
      <div>
        <h2 style={{ marginBottom: 'var(--space-1)' }}>Editorial calendar</h2>
        <p className="experts-subtitle">{props.periodLabel}</p>
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button className="btn-secondary" onClick={props.onPrevious}>
          Previous
        </button>
        <button
          className={props.view === 'week' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => props.onChangeView('week')}
        >
          Week
        </button>
        <button
          className={props.view === 'month' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => props.onChangeView('month')}
        >
          Month
        </button>
        <button className="btn-secondary" onClick={props.onNext}>
          Next
        </button>

        <button className="btn-primary" onClick={props.onCreateDraft}>
          Create draft
        </button>
      </div>
    </header>
  );
}
