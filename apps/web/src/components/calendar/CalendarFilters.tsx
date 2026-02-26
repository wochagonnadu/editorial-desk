// PATH: apps/web/src/components/calendar/CalendarFilters.tsx
// WHAT: Filter bar for expert, status, and risk level
// WHY:  FR-051 — narrow calendar view by relevant planning dimensions
// RELEVANT: apps/web/src/pages/CalendarPage.tsx,apps/web/src/components/calendar/types.ts

import type { CalendarRisk } from './types';

interface Option {
  value: string;
  label: string;
}

interface CalendarFiltersProps {
  expertId: string;
  status: string;
  risk: '' | CalendarRisk;
  experts: Option[];
  statuses: Option[];
  onChange: (next: { expertId: string; status: string; risk: '' | CalendarRisk }) => void;
}

export function CalendarFilters(props: CalendarFiltersProps) {
  return (
    <section className="card approvals-list">
      <h3 style={{ margin: 0 }}>Filters</h3>
      <div className="calendar-filter-row">
        <select
          value={props.expertId}
          onChange={(e) =>
            props.onChange({ expertId: e.target.value, status: props.status, risk: props.risk })
          }
        >
          <option value="">All experts</option>
          {props.experts.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={props.status}
          onChange={(e) =>
            props.onChange({ expertId: props.expertId, status: e.target.value, risk: props.risk })
          }
        >
          <option value="">All statuses</option>
          {props.statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={props.risk}
          onChange={(e) =>
            props.onChange({
              expertId: props.expertId,
              status: props.status,
              risk: e.target.value as '' | CalendarRisk,
            })
          }
        >
          <option value="">All risk levels</option>
          <option value="high">High risk</option>
          <option value="medium">Medium risk</option>
          <option value="low">Low risk</option>
        </select>
        <button
          className="btn-secondary"
          onClick={() => props.onChange({ expertId: '', status: '', risk: '' })}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
