// PATH: apps/web/src/App.tsx
// WHAT: Web router with public routes and private app shell routes
// WHY:  Centralizes auth guard and route composition for the web app
// RELEVANT: apps/web/src/components/RequireAuth.tsx,apps/web/src/services/session.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAuth } from './components/RequireAuth';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Logout } from './pages/Logout';
import { PublicDoc } from './pages/PublicDoc';
import { Home } from './pages/Home';
import { Experts } from './pages/Experts';
import { ExpertProfile } from './pages/ExpertProfile';
import { ExpertSetup } from './pages/ExpertSetup';
import { Calendar } from './pages/Calendar';
import { Drafts } from './pages/Drafts';
import { DraftEditor } from './pages/DraftEditor';
import { CreateDraft } from './pages/CreateDraft';
import { SuggestTopics } from './pages/SuggestTopics';
import { Approvals } from './pages/Approvals';
import { Settings } from './pages/Settings';
import { Audit } from './pages/Audit';
import { SessionProvider } from './services/session';

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/verify" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/docs/:draftId" element={<PublicDoc />} />

          {/* Authenticated App Routes */}
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route index element={<Home />} />
            <Route path="experts" element={<Experts />} />
            <Route path="experts/setup" element={<ExpertSetup />} />
            <Route path="experts/:id" element={<ExpertProfile />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="drafts" element={<Drafts />} />
            <Route path="drafts/new" element={<CreateDraft />} />
            <Route path="topics/suggest" element={<SuggestTopics />} />
            <Route path="drafts/:id" element={<DraftEditor />} />
            <Route path="approvals" element={<Approvals />} />
            <Route path="audit" element={<Audit />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
