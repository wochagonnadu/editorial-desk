// PATH: apps/web/src/pages/CalendarPage.tsx
// WHAT: Editorial calendar with week/month views and filter controls
// WHY:  FR-050..052 — visual planning + quick jump to draft editor
// RELEVANT: apps/web/src/components/calendar/WeekView.tsx,apps/web/src/services/editorial-api.ts

import { useNavigate } from 'react-router-dom';
import { CalendarFilters } from '../components/calendar/CalendarFilters';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useCalendarView } from './calendar/useCalendarView';

export const CalendarPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const calendar = useCalendarView(token);

  if (!token) return null;
  if (calendar.loading) return <Skeleton variant="list" />;

  return (
    <section className="approvals-page">
      <CalendarHeader
        view={calendar.view}
        periodLabel={calendar.periodLabel}
        onChangeView={calendar.setView}
        onPrevious={calendar.goPrevious}
        onNext={calendar.goNext}
        onCreateDraft={() => navigate('/drafts/new')}
      />
      <CalendarFilters
        expertId={calendar.filters.expertId}
        status={calendar.filters.status}
        risk={calendar.filters.risk}
        experts={calendar.experts}
        statuses={calendar.statuses}
        onChange={calendar.setFilters}
      />

      {!calendar.visible.length ? <EmptyState message="No scheduled drafts match filters" /> : null}
      {calendar.view === 'week' ? (
        <WeekView
          weekStart={calendar.weekStart}
          items={calendar.visible}
          onOpenDraft={(id) => navigate(`/drafts/${id}`)}
        />
      ) : null}
      {calendar.view === 'month' ? (
        <MonthView
          monthKey={calendar.currentMonth}
          items={calendar.visible}
          onOpenDraft={(id) => navigate(`/drafts/${id}`)}
        />
      ) : null}
    </section>
  );
};
