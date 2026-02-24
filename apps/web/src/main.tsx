// PATH: apps/web/src/main.tsx
// WHAT: React app bootstrap file
// WHY:  Mounts router-enabled app into DOM root
// RELEVANT: apps/web/src/App.tsx,apps/web/index.html,apps/web/src/context/AuthContext.tsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
