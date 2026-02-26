// PATH: apps/web/src/pages/LandingPage.tsx
// WHAT: Public marketing landing with lightweight interactive storytelling blocks
// WHY:  Separates acquisition surface from authenticated editorial workspace
// RELEVANT: apps/web/src/App.tsx,apps/web/src/components/landing/HeroInteractive.tsx

import { Link } from 'react-router-dom';
import { HeroInteractive } from '../components/landing/HeroInteractive';
import { TeamCarousel } from '../components/landing/TeamCarousel';
import { WorkflowInteractive } from '../components/landing/WorkflowInteractive';

const LandingPage = () => {
  return (
    <main className="landing-root">
      <HeroInteractive />
      <WorkflowInteractive />
      <TeamCarousel />
      <section className="card landing-cta">
        <h2>Start your newsroom pilot</h2>
        <p>Open the workspace and run your first draft flow in minutes.</p>
        <div className="row">
          <Link to="/" className="btn-primary">
            Enter workspace
          </Link>
          <a className="btn-secondary" href="mailto:founders@editorialdesk.ai">
            Talk to founders
          </a>
        </div>
      </section>
    </main>
  );
};

export default LandingPage;
