// PATH: apps/web/src/pages/calendar/useCalendarView.ts
// WHAT: Calendar state and data orchestration for week/month and filters
// WHY:  Keeps CalendarPage lean and under 100 LOC while preserving behavior
// RELEVANT: apps/web/src/pages/CalendarPage.tsx,apps/web/src/pages/calendar/calendar-utils.ts

import { useEffect, useMemo, useState } from 'react';
import type { CalendarRisk } from '../../components/calendar/types';
import { apiClient } from '../../services/api';
import { editorialApi } from '../../services/editorial-api';
import {
  filterEntries,
  inMonth,
  inWeek,
  monthKey,
  monthLabel,
  shiftAnchor,
  startOfWeek,
  toCalendarEntries,
  weekRangeLabel,
} from './calendar-utils';

export function useCalendarView(token: string | null) {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
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

  const statuses = useMemo(
    () =>
      [...new Set(entries.map((item) => item.status))].map((status) => ({
        value: status,
        label: status,
      })),
    [entries],
  );
  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const currentMonth = useMemo(() => monthKey(anchorDate), [anchorDate]);
  const visible = useMemo(() => {
    const filtered = filterEntries(entries, filters);
    if (view === 'week') return filtered.filter((item) => inWeek(item.scheduledDate, weekStart));
    return filtered.filter((item) => inMonth(item.scheduledDate, currentMonth));
  }, [entries, filters, view, weekStart, currentMonth]);

  return {
    loading,
    view,
    setView,
    filters,
    setFilters,
    experts,
    statuses,
    visible,
    weekStart,
    currentMonth,
    periodLabel: view === 'week' ? weekRangeLabel(weekStart) : monthLabel(currentMonth),
    goPrevious: () => setAnchorDate((current) => shiftAnchor(view, current, -1)),
    goNext: () => setAnchorDate((current) => shiftAnchor(view, current, 1)),
  };
}
