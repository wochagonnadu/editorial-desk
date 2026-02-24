// PATH: apps/web/src/App.tsx
// WHAT: Minimal dashboard shell with routing placeholder
// WHY:  Gives Phase 1 a working SPA entry before feature pages
// RELEVANT: apps/web/src/main.tsx,apps/web/src/context/AuthContext.tsx,apps/web/src/services/api.ts

import { FormEvent, useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { apiClient } from './services/api';

const Placeholder = ({ label }: { label: string }) => <section><h1>{label}</h1></section>;

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
      <form onSubmit={submitEmail}><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" /><button>Send link</button></form>
      <form onSubmit={submitToken}><input value={magicToken} onChange={(e) => setMagicToken(e.target.value)} placeholder="token" /><button>Verify</button></form>
      <p>{message}</p>
    </main>
  );
};

const App = () => {
  const { token, logout } = useAuth();
  const [companyName, setCompanyName] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    apiClient.getCompanyMe(token).then((company) => setCompanyName(company.name)).catch(() => setCompanyName(''));
  }, [token]);

  if (!token) return <LoginPanel />;

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Virtual Newsroom</h2>
        <p>{companyName || 'Company'}</p>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/experts">Experts</Link>
          <Link to="/calendar">Calendar</Link>
          <Link to="/drafts">Drafts</Link>
          <Link to="/approvals">Approvals</Link>
          <Link to="/audit">Audit</Link>
        </nav>
        <button onClick={logout}>Logout</button>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Placeholder label="Home" />} />
          <Route path="/experts" element={<Placeholder label="Experts" />} />
          <Route path="/calendar" element={<Placeholder label="Calendar" />} />
          <Route path="/drafts" element={<Placeholder label="Drafts" />} />
          <Route path="/approvals" element={<Placeholder label="Approvals" />} />
          <Route path="/audit" element={<Placeholder label="Audit" />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
