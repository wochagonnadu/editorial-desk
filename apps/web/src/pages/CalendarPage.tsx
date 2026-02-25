// PATH: apps/web/src/pages/CalendarPage.tsx
// WHAT: Editorial calendar with week/month views and filter controls
// WHY:  FR-050..052 — visual planning + quick jump to draft editor
// RELEVANT: apps/web/src/components/calendar/WeekView.tsx,apps/web/src/services/editorial-api.ts

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarFilters } from '../components/calendar/CalendarFilters';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { MonthView } from '../components/calendar/MonthView';
import { WeekView } from '../components/calendar/WeekView';
import type { CalendarRisk } from '../components/calendar/types';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { editorialApi } from '../services/editorial-api';
import { filterEntries, monthKey, startOfWeek, toCalendarEntries } from './calendar/calendar-utils';

export const CalendarPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [filters, setFilters] = useState<{
    expertId: string;
    status: string;
    risk: '' | CalendarRisk;
  }>({ expertId: '', status: '', risk: '' });
  const [entries, setEntries] = useState<ReturnType<typeof toCalendarEntries>>([]);
  const [experts, setExperts] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      editorialApi.getDrafts(token).then((res) => toCalendarEntries(res.data)),
      apiClient
        .getExperts(token)
        .then((res) => res.data.map((e) => ({ value: e.id, label: e.name }))),
    ])
      .then(([nextEntries, nextExperts]) => {
        setEntries(nextEntries);
        setExperts(nextExperts);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters]);
  const statuses = useMemo(
    () =>
      [...new Set(entries.map((item) => item.status))].map((status) => ({
        value: status,
        label: status,
      })),
    [entries],
  );
  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const currentMonth = useMemo(() => monthKey(new Date()), []);

  if (!token) return null;
  if (loading) return <Skeleton variant="list" />;

  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <CalendarHeader view={view} onChangeView={setView} />
      <CalendarFilters
        expertId={filters.expertId}
        status={filters.status}
        risk={filters.risk}
        experts={experts}
        statuses={statuses}
        onChange={setFilters}
      />
      {!filtered.length ? <EmptyState message="No scheduled drafts match filters" /> : null}
      {view === 'week' ? (
        <WeekView
          weekStart={weekStart}
          items={filtered}
          onOpenDraft={(id) => navigate(`/drafts/${id}`)}
        />
      ) : null}
      {view === 'month' ? (
        <MonthView
          monthKey={currentMonth}
          items={filtered}
          onOpenDraft={(id) => navigate(`/drafts/${id}`)}
        />
      ) : null}
    </section>
  );
};
