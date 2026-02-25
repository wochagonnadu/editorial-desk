// PATH: apps/web/src/App.tsx
// WHAT: Dashboard shell — sidebar navigation + routing
// WHY:  FR-001 — persistent sidebar с Home, Experts, Calendar, Drafts, Approvals, Settings
// RELEVANT: apps/web/src/main.tsx, apps/web/src/context/AuthContext.tsx, apps/web/src/pages/index.ts

import { FormEvent, useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { RoleGuard } from './components/RoleGuard';
import {
  CalendarPage,
  ApprovalsPage,
  DraftDetailPage,
  DraftsPage,
  ExpertDetailPage,
  ExpertsPage,
  HomePage,
  LandingPage,
  SettingsPage,
} from './pages';
import { apiClient } from './services/api';

const LoginPanel = () => {
  const { requestMagicLink, verifyMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [message, setMessage] = useState('');

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(await requestMagicLink(email));
  };

  const submitToken = async (event: FormEvent) => {
    event.preventDefault();
    await verifyMagicLink(magicToken);
  };

  return (
    <main className="login-panel">
      <h1>Virtual Newsroom</h1>
      <form onSubmit={submitEmail}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <button>Send link</button>
      </form>
      <form onSubmit={submitToken}>
        <input
          value={magicToken}
          onChange={(e) => setMagicToken(e.target.value)}
          placeholder="token"
        />
        <button>Verify</button>
      </form>
      <p>{message}</p>
    </main>
  );
};

/** FR-001: sidebar items — Home, Experts, Calendar, Drafts, Approvals, Settings */
const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/experts', label: 'Experts' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/drafts', label: 'Drafts' },
  { to: '/approvals', label: 'Approvals' },
  { to: '/settings', label: 'Settings' },
] as const;

const App = () => {
  const { token, user, logout } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const location = useLocation();

  // Settings доступен только owners (FR-002)
  const visibleNav =
    user?.role === 'owner' ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.to !== '/settings');

  useEffect(() => {
    if (!token) return;
    apiClient
      .getCompanyMe(token)
      .then((c) => setCompanyName(c.name))
      .catch(() => setCompanyName(''));
  }, [token]);

  if (!token) return <LoginPanel />;

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Virtual Newsroom</h2>
        <p>{companyName || 'Company'}</p>
        <nav>
          {visibleNav.map(({ to, label }) => (
            <Link key={to} to={to} className={location.pathname === to ? 'active' : ''}>
              {label}
            </Link>
          ))}
        </nav>
        <button onClick={logout}>Logout</button>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/experts" element={<ExpertsPage />} />
          <Route path="/experts/:id" element={<ExpertDetailPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/drafts" element={<DraftsPage />} />
          <Route path="/drafts/:id" element={<DraftDetailPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route
            path="/settings"
            element={
              <RoleGuard allow={['owner']}>
                <SettingsPage />
              </RoleGuard>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
