// PATH: apps/web/src/pages/ExpertsPage.tsx
// WHAT: Experts grid with workload metrics and request action
// WHY:  FR-030/FR-032 — менеджер видит состояние экспертов и может отправить ping
// RELEVANT: apps/web/src/components/experts/ExpertCard.tsx,apps/web/src/services/api.ts

import { useEffect, useMemo, useState } from 'react';
import { AddExpertForm } from '../components/AddExpertForm';
import { ExpertCard } from '../components/experts/ExpertCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import { apiClient, type ExpertListItem } from '../services/api';
import { editorialApi } from '../services/editorial-api';

type Pulse = { voiceReadiness: number; lastResponseAt?: string; draftsInProgress: number };

export const ExpertsPage = () => {
  const { token } = useAuth();
  const [experts, setExperts] = useState<ExpertListItem[]>([]);
  const [pulseMap, setPulseMap] = useState<Record<string, Pulse>>({});
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    const [expertRes, dashboard] = await Promise.all([
      apiClient.getExperts(token),
      editorialApi.getDashboard(token),
    ]);
    setExperts(expertRes.data);
    setPulseMap(
      Object.fromEntries(
        dashboard.teamPulse.map((item) => [
          item.expertId,
          {
            voiceReadiness: item.voiceReadiness,
            lastResponseAt: item.lastResponseAt,
            draftsInProgress: item.draftsInProgress,
          },
        ]),
      ),
    );
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => {
      setNote('Could not load experts yet.');
      setLoading(false);
    });
  }, [token]);

  const cards = useMemo(
    () =>
      experts.map((expert) => {
        const pulse = pulseMap[expert.id];
        return {
          ...expert,
          voiceReadiness:
            pulse?.voiceReadiness ?? (expert.voiceProfileStatus === 'confirmed' ? 100 : 0),
          lastResponseAt: pulse?.lastResponseAt,
          draftsInProgress: pulse?.draftsInProgress ?? 0,
        };
      }),
    [experts, pulseMap],
  );

  const visibleCards = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter(
      (expert) =>
        expert.name.toLowerCase().includes(term) || expert.roleTitle.toLowerCase().includes(term),
    );
  }, [cards, query]);

  if (!token) return null;

  return (
    <section className="experts-page">
      <header className="experts-header">
        <div>
          <h1 style={{ marginBottom: 'var(--space-1)' }}>Experts</h1>
          <p className="experts-subtitle">Manage your subject matter experts and workload.</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search experts by name or role"
          className="experts-search"
        />
      </header>

      <AddExpertForm
        onSubmit={async (payload) => {
          await apiClient.createExpert(token, payload);
          await load();
        }}
      />

      {note ? <p className="draft-editor-note">{note}</p> : null}
      {loading ? <Skeleton variant="list" /> : null}

      {!loading && visibleCards.length === 0 ? (
        <EmptyState
          message={query ? 'No experts match your search' : 'Add your first expert'}
          description={query ? 'Try another name or role.' : undefined}
        />
      ) : null}

      <div className="experts-grid">
        {visibleCards.map((expert) => (
          <ExpertCard
            key={expert.id}
            id={expert.id}
            name={expert.name}
            roleTitle={expert.roleTitle}
            voiceReadiness={expert.voiceReadiness}
            lastResponseAt={expert.lastResponseAt}
            draftsInProgress={expert.draftsInProgress}
            onPing={async (expertId) => {
              await editorialApi.pingExpert(token, expertId);
              setNote('Request 2 minutes sent.');
            }}
          />
        ))}
      </div>
    </section>
  );
};
