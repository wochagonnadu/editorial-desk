// PATH: apps/web/src/components/AppShell.tsx
// WHAT: Main authenticated shell with desktop sidebar and mobile/tablet nav
// WHY:  Keeps navigation predictable across viewports and supports one-click logout
// RELEVANT: apps/web/src/App.tsx,apps/web/src/services/session.tsx

import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  CheckSquare,
  History,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSession } from '../services/session';

const navItems = [
  { name: 'Home', path: '/app', icon: LayoutDashboard },
  { name: 'Experts', path: '/app/experts', icon: Users },
  { name: 'Calendar', path: '/app/calendar', icon: CalendarDays },
  { name: 'Drafts', path: '/app/drafts', icon: FileText },
  { name: 'Approvals', path: '/app/approvals', icon: CheckSquare },
  { name: 'Audit', path: '/app/audit', icon: History },
  { name: 'Settings', path: '/app/settings', icon: Settings },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearSession } = useSession();

  const handleLogout = React.useCallback(() => {
    clearSession();
    navigate('/login', { replace: true });
  }, [clearSession, navigate]);

  return (
    <div className="min-h-[100dvh] bg-beige-50 lg:flex lg:h-[100dvh] lg:overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-ink-100 bg-white lg:flex lg:flex-col">
        <div className="h-16 flex items-center px-6 border-b border-ink-100">
          <span className="font-serif text-xl font-medium tracking-masthead uppercase">
            EditorialDESK
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/app'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-4 py-3 rounded-full text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ink-900 text-white'
                      : 'text-ink-500 hover:bg-beige-50 hover:text-ink-900',
                  )
                }
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-ink-100">
          <div className="flex items-center px-3 py-2">
            <img
              className="h-8 w-8 rounded-full bg-ink-100 object-cover"
              src="https://picsum.photos/seed/user1/100/100"
              alt="User avatar"
              referrerPolicy="no-referrer"
            />
            <div className="ml-3">
              <p className="text-sm font-medium text-ink-900">Sarah Editor</p>
              <p className="text-xs text-ink-500">Managing Editor</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 flex w-full items-center rounded-full px-4 py-3 text-sm font-medium text-ink-500 transition-colors hover:bg-beige-50 hover:text-ink-900"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile/Tablet header + nav */}
      <div className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="font-serif text-lg font-medium tracking-masthead uppercase">
            EditorialDESK
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center rounded-full border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-beige-50"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
        <nav className="overflow-x-auto px-2 pb-2" aria-label="Mobile navigation">
          <div className="flex min-w-max gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={`mobile-${item.name}`}
                to={item.path}
                end={item.path === '/app'}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-ink-900 text-white'
                      : 'text-ink-600 hover:bg-beige-50 hover:text-ink-900',
                  )
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1 lg:flex lg:flex-col lg:overflow-hidden">
        <div className="p-4 md:p-6 lg:h-full lg:flex-1 lg:overflow-y-auto lg:p-8">
          <div className="mx-auto max-w-6xl lg:h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="lg:h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
