// PATH: apps/web/src/pages/HomePage.tsx
// WHAT: Главный дашборд редакции: 5 блоков с приоритетами и активностью
// WHY:  US1 MVP — менеджер за один взгляд видит что требует внимания
// RELEVANT: apps/web/src/services/editorial-api.ts,apps/web/src/components/home/TodayActions.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardData, TodayAction } from '@newsroom/shared';
import { useAuth } from '../context/AuthContext';
import { editorialApi } from '../services/editorial-api';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ActivityFeed } from '../components/home/ActivityFeed';
import { InReviewList } from '../components/home/InReviewList';
import { MiniCalendar } from '../components/home/MiniCalendar';
import { TeamPulse } from '../components/home/TeamPulse';
import { TodayActions } from '../components/home/TodayActions';

const emptyData: DashboardData = {
  todayActions: [],
  inReview: [],
  weekSchedule: [],
  teamPulse: [],
  activityFeed: [],
};

export const HomePage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(emptyData);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    editorialApi
      .getDashboard(token)
      .then((next) => setData(next))
      .catch(() => setData(emptyData))
      .finally(() => setLoading(false));
  }, [token]);

  const isFreshAccount = useMemo(
    () =>
      !data.todayActions.length &&
      !data.inReview.length &&
      !data.weekSchedule.length &&
      !data.teamPulse.length,
    [data],
  );

  const onOpenAction = (targetType: TodayAction['targetType'], targetId: string) => {
    if (targetType === 'draft') return navigate(`/drafts/${targetId}`);
    if (targetType === 'approval_step') return navigate('/approvals');
    return navigate('/drafts');
  };

  if (loading) {
    return (
      <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <header className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Home</h1>
            <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
              Here is what needs your attention today.
            </p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/drafts')}>
            Open drafts
          </button>
        </header>

        <div className="home-two-col">
          <article className="card">
            <Skeleton variant="list" rows={4} />
          </article>
          <article className="card">
            <Skeleton variant="list" rows={4} />
          </article>
          <article className="card">
            <Skeleton variant="list" rows={4} />
          </article>
          <article className="card">
            <Skeleton variant="list" rows={4} />
          </article>
          <article className="card">
            <Skeleton variant="list" rows={4} />
          </article>
        </div>
      </section>
    );
  }

  return (
    <section style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <header className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>Home</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            Here is what needs your attention today.
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/drafts')}>
          Open drafts
        </button>
      </header>

      {isFreshAccount ? (
        <section className="card">
          <EmptyState
            message="Your newsroom is ready. Start with your first expert."
            description="After you add an expert, dashboard widgets fill automatically from live data."
            action={{ label: 'Open Experts', onClick: () => navigate('/experts') }}
          />
        </section>
      ) : null}

      <div className="home-two-col">
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <TodayActions actions={data.todayActions} onOpen={onOpenAction} />
          <InReviewList items={data.inReview} onOpenDraft={(id) => navigate(`/drafts/${id}`)} />
        </div>

        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <TeamPulse items={data.teamPulse} />
          <MiniCalendar items={data.weekSchedule} />
          <ActivityFeed items={data.activityFeed} />
        </div>
      </div>
    </section>
  );
};
