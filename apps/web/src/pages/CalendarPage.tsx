// PATH: apps/web/src/pages/CalendarPage.tsx
// WHAT: Editorial calendar grouped by week with topic status overview
// WHY:  Gives managers a simple planning view without heavy calendar widgets
// RELEVANT: apps/web/src/services/editorial-api.ts,apps/web/src/pages/TopicsPage.tsx

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import type { TopicItem } from '../services/editorial-types';

const weekLabel = (value?: string) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Unknown week';
  const day = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - day);
  return monday.toISOString().slice(0, 10);
};

export const CalendarPage = () => {
  const { token } = useAuth();
  const [topics, setTopics] = useState<TopicItem[]>([]);

  useEffect(() => {
    if (!token) return;
    editorialApi.getTopics(token).then((response) => setTopics(response.data)).catch(() => undefined);
  }, [token]);

  const grouped = useMemo(() => {
    const map = new Map<string, TopicItem[]>();
    for (const topic of topics) {
      const key = weekLabel(topic.created_at);
      map.set(key, [...(map.get(key) ?? []), topic]);
    }
    return Array.from(map.entries()).sort(([left], [right]) => (left < right ? 1 : -1));
  }, [topics]);

  return (
    <section>
      <h2>Editorial calendar</h2>
      {grouped.map(([week, items]) => (
        <article className="card" key={week}>
          <h3>Week of {week}</h3>
          {items.map((topic) => (
            <div className="calendar-row" key={topic.id}>
              <strong>{topic.title}</strong> | {topic.status} | {topic.expert?.name ?? 'Unassigned'}
            </div>
          ))}
        </article>
      ))}
      {grouped.length === 0 ? <p>No topics yet.</p> : null}
    </section>
  );
};
