// PATH: apps/web/src/components/AppShell.tsx
// WHAT: Main authenticated shell with sidebar navigation and page outlet
// WHY:  Keeps app-level layout and transitions consistent across routes
// RELEVANT: apps/web/src/App.tsx,apps/web/src/pages/Logout.tsx

import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
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

  return (
    <div className="flex h-screen bg-beige-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-ink-100 bg-white flex flex-col">
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
          <NavLink
            to="/logout"
            className="mt-2 flex items-center px-4 py-3 rounded-full text-sm font-medium text-ink-500 hover:bg-beige-50 hover:text-ink-900 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
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
