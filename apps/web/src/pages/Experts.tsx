// PATH: apps/web/src/pages/Experts.tsx
// WHAT: Experts list page wired to list and ping API actions
// WHY:  Replaces static expert cards with live company experts data
// RELEVANT: apps/web/src/services/experts.ts,apps/web/src/pages/ExpertSetup.tsx

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Mail, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchExperts, requestExpertPing, type ExpertItem } from '../services/experts';
import { useSession } from '../services/session';

const readinessFromStatus = (status: string): number => {
  if (status === 'active') return 100;
  if (status === 'voice_testing') return 75;
  if (status === 'onboarding') return 50;
  return 20;
};

export function Experts() {
  const navigate = useNavigate();
  const { session } = useSession();
  const [items, setItems] = useState<ExpertItem[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [pingingId, setPingingId] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    try {
      setError(null);
      setItems(await fetchExperts(session.token));
    } catch {
      setError('Could not load experts');
    }
  };

  useEffect(() => {
    void load();
  }, [session]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(needle) || item.roleTitle.toLowerCase().includes(needle)
      );
    });
  }, [items, query]);

  const handlePing = async (id: string) => {
    if (!session) return;
    try {
      setError(null);
      setPingingId(id);
      await requestExpertPing(session.token, id);
    } catch {
      setError('Could not send reminder');
    } finally {
      setPingingId(null);
    }
  };

  const openSetup = (event: React.FormEvent) => {
    event.preventDefault();
    setIsAddModalOpen(false);
    navigate('/app/experts/setup', { state: { name, role, email } });
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Experts</h1>
          <p className="text-ink-500 mt-1">Manage your team of subject matter experts.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add expert
        </button>
      </header>

      {error ? <div className="card text-red-600">{error}</div> : null}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search experts..."
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-ink-100 bg-white focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((expert) => {
          const readiness = Math.max(
            expert.onboardingProgress * 20,
            readinessFromStatus(expert.status),
          );
          return (
            <div key={expert.id} className="card flex flex-col gap-4">
              <div>
                <Link
                  to={`/app/experts/${expert.id}`}
                  className="text-lg font-serif font-medium text-ink-900 hover:text-terracotta-600"
                >
                  {expert.name}
                </Link>
                <p className="text-sm text-ink-500">{expert.roleTitle}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-500">Status</span>
                  <span className="font-medium text-ink-900">{expert.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Readiness</span>
                  <span className="font-medium text-ink-900">{readiness}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-500">Voice profile</span>
                  <span className="font-medium text-ink-900">{expert.voiceProfileStatus}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handlePing(expert.id)}
                disabled={pingingId === expert.id}
                className="btn-secondary w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                {pingingId === expert.id ? 'Sending...' : 'Request 2 minutes'}
              </button>
            </div>
          );
        })}
      </div>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-slide-sm shadow-2xl w-full max-w-lg overflow-hidden border border-ink-100">
            <div className="px-6 py-5 border-b border-ink-100 flex justify-between items-center bg-beige-50">
              <h2 className="text-xl font-serif font-medium text-ink-900">Invite New Expert</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-ink-400 hover:text-ink-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={openSetup} className="p-6 space-y-4">
              <input
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-ink-200"
                placeholder="Full name"
              />
              <input
                type="text"
                required
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-ink-200"
                placeholder="Role / Title"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-ink-200"
                placeholder="Email address"
              />
              <div className="pt-4 flex justify-end space-x-3 border-t border-ink-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Continue setup
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
