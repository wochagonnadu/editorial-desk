// PATH: apps/web/src/pages/Calendar.tsx
// WHAT: Editorial calendar page powered by filtered drafts API data
// WHY:  Replaces mock week/month events with live drafts schedule surface
// RELEVANT: apps/web/src/services/drafts.ts,apps/web/src/services/experts.ts

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchDrafts, type DraftListItem } from '../services/drafts';
import { fetchExperts } from '../services/experts';
import { useSession } from '../services/session';

const startOfWeek = (date: Date): Date => {
  const next = new Date(date);
  const day = next.getDay();
  const shift = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + shift);
  next.setHours(0, 0, 0, 0);
  return next;
};

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

const statusClass = (status: string): string => {
  if (status === 'needs_review') return 'status-review';
  if (status === 'drafting') return 'status-drafting';
  if (status === 'approved') return 'status-approved';
  if (status === 'revisions') return 'status-revisions';
  return 'status-factcheck';
};

export function Calendar() {
  const { session } = useSession();
  const [anchorDate, setAnchorDate] = useState<Date>(() => startOfWeek(new Date()));
  const [statusFilter, setStatusFilter] = useState('');
  const [expertFilter, setExpertFilter] = useState('');
  const [items, setItems] = useState<DraftListItem[]>([]);
  const [experts, setExperts] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        setError(null);
        const [drafts, expertList] = await Promise.all([
          fetchDrafts(session.token, {
            status: statusFilter || undefined,
            expertId: expertFilter || undefined,
          }),
          fetchExperts(session.token),
        ]);
        setItems(drafts);
        setExperts(expertList.map((item) => ({ id: item.id, name: item.name })));
      } catch {
        setError('Could not load calendar data');
      }
    };
    void load();
  }, [expertFilter, session, statusFilter]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(anchorDate);
      date.setDate(anchorDate.getDate() + index);
      return date;
    });
  }, [anchorDate]);

  const byDay = useMemo(() => {
    const map = new Map<string, DraftListItem[]>();
    for (const day of weekDays) map.set(dayKey(day), []);
    for (const item of items) {
      const key = dayKey(new Date(item.updatedAt));
      if (!map.has(key)) continue;
      map.get(key)?.push(item);
    }
    return map;
  }, [items, weekDays]);

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Editorial Calendar</h1>
          <p className="text-ink-500 mt-1">Live view from drafts API</p>
        </div>
        <Link to="/app/drafts/new" className="btn-primary">
          Create draft
        </Link>
      </header>

      {error ? <div className="card text-red-600">{error}</div> : null}

      <div className="bg-white border border-ink-100 rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="p-2 hover:bg-beige-50 rounded-lg"
            onClick={() =>
              setAnchorDate((prev) => {
                const next = new Date(prev);
                next.setDate(prev.getDate() - 7);
                return next;
              })
            }
          >
            <ChevronLeft className="w-5 h-5 text-ink-500" />
          </button>
          <span className="font-medium text-ink-900">
            {weekDays[0]?.toLocaleDateString()} - {weekDays[6]?.toLocaleDateString()}
          </span>
          <button
            className="p-2 hover:bg-beige-50 rounded-lg"
            onClick={() =>
              setAnchorDate((prev) => {
                const next = new Date(prev);
                next.setDate(prev.getDate() + 7);
                return next;
              })
            }
          >
            <ChevronRight className="w-5 h-5 text-ink-500" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm"
          >
            <option value="">All statuses</option>
            <option value="drafting">drafting</option>
            <option value="factcheck">factcheck</option>
            <option value="needs_review">needs_review</option>
            <option value="revisions">revisions</option>
            <option value="approved">approved</option>
          </select>

          <select
            value={expertFilter}
            onChange={(event) => setExpertFilter(event.target.value)}
            className="px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm"
          >
            <option value="">All experts</option>
            {experts.map((expert) => (
              <option key={expert.id} value={expert.id}>
                {expert.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-7 gap-4 min-h-[500px]">
        {weekDays.map((day) => {
          const key = dayKey(day);
          const dayItems = byDay.get(key) ?? [];
          return (
            <div key={key} className="flex flex-col">
              <div className="text-center mb-3">
                <div className="text-xs font-medium text-ink-500 uppercase">
                  {day.toLocaleDateString(undefined, { weekday: 'short' })}
                </div>
                <div className="text-2xl font-serif mt-1 text-ink-900">{day.getDate()}</div>
              </div>
              <div className="flex-1 bg-white border border-ink-100 rounded-2xl p-2 space-y-2">
                {dayItems.length === 0 ? (
                  <p className="text-xs text-ink-400 p-2">No items</p>
                ) : (
                  dayItems.map((item) => (
                    <Link
                      key={item.id}
                      to={`/app/drafts/${item.id}`}
                      className="block p-3 bg-beige-50 rounded-xl border border-ink-100 hover:border-ink-300"
                    >
                      <span className={`status-pill mb-2 ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                      <h3 className="font-medium text-sm text-ink-900 leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-xs text-ink-500 mt-2">{item.expertName}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
