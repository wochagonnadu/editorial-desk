// PATH: apps/web/src/pages/Landing.tsx
// WHAT: Marketing landing page with beta access form submission flow
// WHY:  Connects public CTA to backend so requests are not lost
// RELEVANT: apps/web/src/services/landing.ts,services/api/src/routes/landing-requests.ts

import React from 'react';
import { Shield, Clock, FileText, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { HeroInteractive } from '../components/HeroInteractive';
import { TeamCarousel } from '../components/TeamCarousel';
import { WorkflowInteractive } from '../components/WorkflowInteractive';
import { submitLandingRequest } from '../services/landing';
import { ApiError } from '../services/api/client';

// Premium easing curve (Apple-like)
const customEase = [0.16, 1, 0.3, 1] as const;

const Slide = ({
  children,
  className = '',
  zIndex,
  index,
  title,
  isPast,
}: {
  children: React.ReactNode;
  className?: string;
  zIndex: number;
  index: number;
  title?: string;
  isPast: boolean;
}) => {
  // Header is 64px (h-16). We offset all slides by this amount so they don't overlap the header.
  const headerHeight = 64;
  // Hero (index 1) and Problem (index 2) both have peekOffset 0.
  // This means Problem completely covers Hero, leaving no blank peek for Hero.
  const peekOffset = index <= 2 ? 0 : (index - 2) * 24;
  const topOffset = headerHeight + peekOffset;

  return (
    <section
      className={`w-full relative md:sticky flex flex-col min-h-screen md:min-h-0 md:overflow-hidden md:top-[var(--md-top)] md:h-[var(--md-height)] ${className} ${index > 1 ? 'rounded-t-[2rem] md:rounded-t-slide-md border-t border-ink-900/5 md:shadow-slide' : ''}`}
      style={
        {
          '--md-top': `${topOffset}px`,
          '--md-height': `calc(100vh - ${topOffset}px)`,
          zIndex,
          gridRowStart: index,
          gridRowEnd: 6,
          gridColumn: '1 / -1',
        } as React.CSSProperties
      }
    >
      {index > 1 && title && (
        <button
          onClick={() =>
            window.scrollTo({ top: (index - 1) * window.innerHeight, behavior: 'smooth' })
          }
          className="hidden md:flex absolute top-0 left-0 w-full h-peek items-center justify-center z-20 cursor-pointer hover:bg-black/5 transition-colors"
          aria-label={`Scroll to ${title}`}
        >
          <span className="text-[10px] uppercase tracking-label opacity-50 hover:opacity-100 font-medium transition-opacity">
            {title}
          </span>
        </button>
      )}
      <div
        className={`flex-1 flex flex-col w-full h-full transition-all duration-1000 ease-apple origin-top ${isPast ? 'md:opacity-0 md:scale-95 md:blur-xl' : 'md:opacity-100 md:scale-100 md:blur-0'}`}
      >
        <div className="m-auto w-full py-12 md:py-10 max-h-full flex flex-col justify-center">
          {children}
        </div>
      </div>
    </section>
  );
};

const FadeUp = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 60 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: false, amount: 0.2 }}
    transition={{ duration: 1, ease: customEase, delay }}
  >
    {children}
  </motion.div>
);

export function Landing() {
  const [activeSection, setActiveSection] = React.useState(0);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSent, setIsSent] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    try {
      setFormError(null);
      setIsSent(false);
      setIsSubmitting(true);
      await submitLandingRequest({ name: name.trim(), email: email.trim() });
      setIsSent(true);
      setName('');
      setEmail('');
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Could not submit request right now');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    const handleScroll = () => {
      const index = Math.round(window.scrollY / window.innerHeight);
      setActiveSection(Math.min(Math.max(index, 0), 4));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    // Force strict scroll snapping on the html element to prevent skipping slides
    // Only apply on desktop
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('snap-y', 'snap-mandatory');
      } else {
        document.documentElement.classList.remove('snap-y', 'snap-mandatory');
      }
    };
    handleMediaChange(mediaQuery);
    mediaQuery.addEventListener('change', handleMediaChange);
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      document.documentElement.classList.remove('snap-y', 'snap-mandatory');
    };
  }, []);

  return (
    <div className="relative bg-beige-50 text-ink-900 font-sans selection:bg-terracotta-500/20">
      {/* Solid Fixed Header */}
      <nav className="fixed top-0 w-full z-[100] bg-beige-50 text-ink-900 border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-6 h-16 grid grid-cols-3 items-center">
          {/* Left: Empty to balance the grid */}
          <div></div>

          {/* Center: Newspaper Masthead */}
          <div className="flex justify-center">
            <div className="border-y border-ink-900 py-1 px-3 text-center">
              <span className="font-serif text-lg md:text-xl font-medium tracking-masthead uppercase">
                EditorialDESK
              </span>
            </div>
          </div>

          {/* Right: Sign in */}
          <div className="flex justify-end items-center">
            {/* Desktop Sign in */}
            <Link
              to="/login"
              className="hidden md:block text-[10px] md:text-[11px] font-medium px-4 py-2 rounded-full border border-ink-200 hover:bg-ink-900 hover:text-white transition-all uppercase tracking-widest"
            >
              Sign in
            </Link>
            {/* Mobile Sign in Icon */}
            <Link
              to="/login"
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-ink-900/5 active:scale-95 transition-all group"
              aria-label="Sign in"
            >
              <LogIn
                className="w-5 h-5 text-ink-900 group-hover:translate-x-0.5 transition-transform duration-300"
                strokeWidth={1.5}
              />
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex flex-col md:grid md:grid-cols-1 md:auto-rows-[100vh]">
        {/* Snap Targets */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={`snap-${i}`}
            className="hidden md:block w-full h-screen snap-start snap-always pointer-events-none"
            style={{ gridRowStart: i, gridColumn: '1 / -1' }}
          />
        ))}

        {/* 1. Hero */}
        <Slide index={1} zIndex={10} isPast={activeSection >= 1} className="bg-beige-50 px-6">
          <div className="max-w-7xl mx-auto w-full min-h-[500px] md:h-[600px] flex flex-col justify-center">
            <HeroInteractive />
          </div>
        </Slide>

        {/* 2. Pain Points */}
        <Slide
          index={2}
          zIndex={20}
          title="The Problem"
          isPast={activeSection >= 2}
          className="bg-white px-6"
        >
          <div className="max-w-7xl mx-auto w-full">
            <FadeUp>
              <h2 className="text-3xl md:text-6xl font-serif font-medium mb-8 md:mb-12 tracking-tight">
                The old way
                <br />
                is broken.
              </h2>
            </FadeUp>
            <div className="grid md:grid-cols-3 gap-8 md:gap-10">
              {[
                {
                  icon: Clock,
                  title: 'No Time',
                  desc: 'Experts are too busy doing their actual jobs to write 2,000-word articles.',
                },
                {
                  icon: FileText,
                  title: 'Approval Chaos',
                  desc: 'Drafts get lost in email chains, Slack threads, and forgotten Google Docs.',
                },
                {
                  icon: Shield,
                  title: 'Trust Issues',
                  desc: "Marketing writes it, but the expert doesn't feel it sounds like them.",
                },
              ].map((pain, i) => (
                <FadeUp key={i} delay={i * 0.1}>
                  <div className="border-t-2 border-ink-100 pt-6">
                    <pain.icon className="w-8 h-8 md:w-10 md:h-10 text-terracotta-500 mb-4 md:mb-6" />
                    <h3 className="text-2xl md:text-3xl font-serif font-medium mb-2 md:mb-4">
                      {pain.title}
                    </h3>
                    <p className="text-base md:text-lg text-ink-500 leading-relaxed">{pain.desc}</p>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </Slide>

        {/* 3. Team */}
        <Slide
          index={3}
          zIndex={30}
          title="The Team"
          isPast={activeSection >= 3}
          className="bg-beige-100"
        >
          <div className="w-full h-full flex flex-col justify-center">
            <div className="max-w-7xl mx-auto w-full px-6 mb-8 md:mb-12">
              <FadeUp>
                <h2 className="text-3xl md:text-6xl font-serif font-medium tracking-tight">
                  Meet your new
                  <br />
                  editorial team.
                </h2>
              </FadeUp>
            </div>
            <TeamCarousel />
          </div>
        </Slide>

        {/* 4. Workflow */}
        <Slide
          index={4}
          zIndex={40}
          title="Workflow"
          isPast={activeSection >= 4}
          className="bg-ink-900 text-white px-6 relative overflow-hidden"
        >
          {/* Premium gradient drift background */}
          <motion.div
            animate={{
              x: ['-5%', '5%', '-5%'],
              y: ['-5%', '5%', '-5%'],
            }}
            transition={{ duration: 20, ease: 'easeInOut', repeat: Infinity }}
            className="absolute top-0 left-0 w-[110%] h-[110%] -ml-[5%] -mt-[5%] pointer-events-none z-0"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)',
            }}
          />
          <div className="max-w-7xl mx-auto w-full relative z-10">
            <WorkflowInteractive />
          </div>
        </Slide>

        {/* 5. Pricing & CTA */}
        <Slide
          index={5}
          zIndex={50}
          title="Pricing"
          isPast={false}
          className="bg-terracotta-500 text-white px-6"
        >
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 md:gap-24 items-center">
            <div>
              <FadeUp>
                <h2 className="text-4xl md:text-7xl font-serif font-medium mb-6 tracking-tight leading-none">
                  Less than an
                  <br />
                  agency.
                </h2>
                <p className="text-lg md:text-2xl text-terracotta-100 mb-8 max-w-md leading-relaxed">
                  Get the output of a full editorial team for a fraction of the cost, with higher
                  quality and authenticity.
                </p>
                <div className="inline-block border border-terracotta-400 rounded-full px-6 py-3 text-terracotta-100 font-medium tracking-wide uppercase text-sm">
                  Starting at $999/mo
                </div>
              </FadeUp>
            </div>

            <div>
              <FadeUp delay={0.2}>
                <div className="bg-white text-ink-900 p-8 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-2xl">
                  <h3 className="text-3xl md:text-4xl font-serif font-medium mb-6">
                    Start your newsroom
                  </h3>
                  <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4 md:space-y-6">
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-ink-500 mb-1 md:mb-2 uppercase tracking-wider">
                          Name
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                          className="w-full px-4 py-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl border-2 border-ink-100 bg-beige-50 focus:outline-none focus:border-ink-900 transition-colors text-base md:text-lg"
                          placeholder="Jane Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-xs md:text-sm font-medium text-ink-500 mb-1 md:mb-2 uppercase tracking-wider">
                          Company Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          className="w-full px-4 py-3 md:px-5 md:py-4 rounded-xl md:rounded-2xl border-2 border-ink-100 bg-beige-50 focus:outline-none focus:border-ink-900 transition-colors text-base md:text-lg"
                          placeholder="jane@company.com"
                        />
                      </div>
                    </div>
                    <button
                      disabled={isSubmitting}
                      className="w-full py-4 md:py-5 bg-ink-900 text-white rounded-xl md:rounded-2xl font-medium text-base md:text-lg hover:bg-ink-800 transition-all active:scale-[0.98] mt-2 md:mt-4 shadow-xl shadow-ink-900/20 disabled:opacity-60"
                    >
                      {isSubmitting ? 'Submitting...' : 'Request Beta Access'}
                    </button>
                    {isSent ? (
                      <p className="text-sm text-green-700">
                        Thanks! We got your request and will email you.
                      </p>
                    ) : null}
                    {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
                  </form>
                </div>
              </FadeUp>
            </div>
          </div>
        </Slide>
      </div>
    </div>
  );
}
