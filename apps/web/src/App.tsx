// PATH: apps/web/src/App.tsx
// WHAT: Minimal dashboard shell with routing placeholder
// WHY:  Gives Phase 1 a working SPA entry before feature pages
// RELEVANT: apps/web/src/main.tsx,specs/001-virtual-newsroom-mvp/tasks.md

import { Link, Route, Routes } from 'react-router-dom';

const Placeholder = ({ label }: { label: string }) => <section><h1>{label}</h1></section>;

const App = () => {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Virtual Newsroom</h2>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/experts">Experts</Link>
          <Link to="/drafts">Drafts</Link>
        </nav>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Placeholder label="Home" />} />
          <Route path="/experts" element={<Placeholder label="Experts" />} />
          <Route path="/drafts" element={<Placeholder label="Drafts" />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
