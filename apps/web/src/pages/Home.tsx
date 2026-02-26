import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0, duration: 0.5 } },
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Good morning, Sarah</h1>
          <p className="text-ink-500 mt-1">Here is what needs your attention today.</p>
        </div>
        <Link to="/app/drafts/new" className="btn-primary">
          Create draft
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Actions & Review */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Actions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-medium">Today's Actions</h2>
            </div>
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
              {[
                {
                  title: 'Review "Future of Remote Work"',
                  expert: 'Dr. Emily Chen',
                  status: 'Needs Review',
                  time: 'Due in 2h',
                  urgent: true,
                },
                {
                  title: 'Approve weekly topics',
                  expert: 'Editorial Team',
                  status: 'Drafting',
                  time: 'Due today',
                  urgent: false,
                },
                {
                  title: 'Fact-check "Q3 Market Analysis"',
                  expert: 'Marcus Johnson',
                  status: 'Factcheck',
                  time: 'Due tomorrow',
                  urgent: false,
                },
              ].map((action, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="card p-4 flex items-center justify-between hover:border-ink-300 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 cursor-pointer group"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-2 h-2 rounded-full ${action.urgent ? 'bg-terracotta-500' : 'bg-ink-300'}`}
                    />
                    <div>
                      <h3 className="font-medium text-ink-900 group-hover:text-terracotta-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-ink-500 mt-0.5">
                        {action.expert} • {action.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`status-pill ${
                        action.status === 'Needs Review'
                          ? 'status-review'
                          : action.status === 'Drafting'
                            ? 'status-drafting'
                            : 'status-factcheck'
                      }`}
                    >
                      {action.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-ink-900 transition-colors" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* In Review */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-medium">In Review</h2>
              <Link
                to="/app/approvals"
                className="text-sm text-ink-500 hover:text-ink-900 font-medium"
              >
                View all
              </Link>
            </div>
            <div className="card overflow-hidden p-0">
              <motion.ul
                variants={container}
                initial="hidden"
                animate="show"
                className="divide-y divide-ink-100"
              >
                {[
                  {
                    title: 'Sustainable Supply Chains',
                    expert: 'Sarah Jenkins',
                    waitTime: '2 days',
                    status: 'Needs Review',
                  },
                  {
                    title: 'AI in Healthcare',
                    expert: 'Dr. Robert Smith',
                    waitTime: '4 hours',
                    status: 'Revisions',
                  },
                ].map((itemData, i) => (
                  <motion.li
                    key={i}
                    variants={item}
                    className="p-4 hover:bg-beige-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-ink-900">{itemData.title}</p>
                      <div className="flex items-center text-sm text-ink-500 mt-1 space-x-3">
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Waiting {itemData.waitTime}
                        </span>
                        <span>•</span>
                        <span>{itemData.expert}</span>
                      </div>
                    </div>
                    <span
                      className={`status-pill ${itemData.status === 'Revisions' ? 'status-revisions' : 'status-review'}`}
                    >
                      {itemData.status}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>
        </div>

        {/* Right Column: Pulse & Calendar */}
        <div className="space-y-8">
          {/* Team Pulse */}
          <section>
            <h2 className="text-lg font-serif font-medium mb-4">Team Pulse</h2>
            <div className="card space-y-4">
              {[
                { name: 'Dr. Emily Chen', role: 'Tech Expert', readiness: 95, avatar: 'user2' },
                { name: 'Marcus Johnson', role: 'Finance', readiness: 80, avatar: 'user3' },
                { name: 'Sarah Jenkins', role: 'Operations', readiness: 60, avatar: 'user4' },
              ].map((expert, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={`https://picsum.photos/seed/${expert.avatar}/100/100`}
                      alt={expert.name}
                      className="w-10 h-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-medium text-sm text-ink-900">{expert.name}</p>
                      <p className="text-xs text-ink-500">{expert.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink-900">{expert.readiness}%</p>
                    <p className="text-xs text-ink-500">Voice ready</p>
                  </div>
                </div>
              ))}
              <Link
                to="/app/experts"
                className="block w-full text-center text-sm font-medium text-ink-500 hover:text-ink-900 mt-2 pt-4 border-t border-ink-100"
              >
                Manage experts
              </Link>
            </div>
          </section>

          {/* This Week */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif font-medium">This Week</h2>
              <Link
                to="/app/calendar"
                className="text-sm text-ink-500 hover:text-ink-900 font-medium"
              >
                Calendar
              </Link>
            </div>
            <div className="card p-4 space-y-4">
              <div className="flex justify-between text-sm text-ink-500 font-medium pb-2 border-b border-ink-100">
                <span>Mon</span>
                <span>Tue</span>
                <span className="text-ink-900 bg-beige-100 px-2 rounded-md">Wed</span>
                <span>Thu</span>
                <span>Fri</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-approved-600 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium text-ink-900">Publish: Remote Work</p>
                    <p className="text-xs text-ink-500">Today</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-warning-600 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium text-ink-900">Review: Q3 Analysis</p>
                    <p className="text-xs text-ink-500">Tomorrow</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
