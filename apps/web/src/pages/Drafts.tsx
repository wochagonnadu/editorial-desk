import React from 'react';
import { Search, Filter, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

const drafts = [
  {
    id: 1,
    title: 'The Future of Remote Work',
    expert: 'Dr. Emily Chen',
    status: 'Needs Review',
    risk: 'Low',
    factchecks: 0,
    reviewer: 'Sarah Editor',
    updated: '2 hours ago',
  },
  {
    id: 2,
    title: 'Q3 Market Analysis',
    expert: 'Marcus Johnson',
    status: 'Factcheck',
    risk: 'Medium',
    factchecks: 3,
    reviewer: 'Factcheck Team',
    updated: '5 hours ago',
  },
  {
    id: 3,
    title: 'AI in Healthcare Ethics',
    expert: 'Dr. Robert Smith',
    status: 'Revisions',
    risk: 'High',
    factchecks: 5,
    reviewer: 'Dr. Robert Smith',
    updated: '1 day ago',
  },
  {
    id: 4,
    title: 'Sustainable Supply Chains',
    expert: 'Sarah Jenkins',
    status: 'Drafting',
    risk: 'Low',
    factchecks: 0,
    reviewer: 'Content Team',
    updated: '2 days ago',
  },
  {
    id: 5,
    title: 'Cybersecurity Trends 2024',
    expert: 'Dr. Emily Chen',
    status: 'Approved',
    risk: 'Low',
    factchecks: 0,
    reviewer: 'Ready to Publish',
    updated: '3 days ago',
  },
];

export function Drafts() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0, duration: 0.4 } },
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Drafts</h1>
          <p className="text-ink-500 mt-1">Inventory of all materials in progress.</p>
        </div>
        <Link to="/app/drafts/new" className="btn-primary">
          Create draft
        </Link>
      </header>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            type="text"
            placeholder="Search drafts..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-ink-100 bg-white focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-transparent"
          />
        </div>
        <button className="btn-secondary">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-beige-50 border-b border-ink-100">
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Expert
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Next Reviewer
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="py-3 px-4 text-sm font-medium text-ink-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <motion.tbody
              variants={container}
              initial="hidden"
              animate="show"
              className="divide-y divide-ink-100"
            >
              {drafts.map((draft) => (
                <motion.tr
                  key={draft.id}
                  variants={item}
                  className="hover:bg-beige-50 transition-colors group"
                >
                  <td className="py-4 px-4">
                    <Link
                      to={`/app/drafts/${draft.id}`}
                      className="font-medium text-ink-900 group-hover:text-terracotta-600 transition-colors"
                    >
                      {draft.title}
                    </Link>
                  </td>
                  <td className="py-4 px-4 text-sm text-ink-500">{draft.expert}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`status-pill ${
                        draft.status === 'Needs Review'
                          ? 'status-review'
                          : draft.status === 'Drafting'
                            ? 'status-drafting'
                            : draft.status === 'Approved'
                              ? 'status-approved'
                              : draft.status === 'Revisions'
                                ? 'status-revisions'
                                : 'status-factcheck'
                      }`}
                    >
                      {draft.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          draft.risk === 'High'
                            ? 'bg-terracotta-500'
                            : draft.risk === 'Medium'
                              ? 'bg-warning-500'
                              : 'bg-approved-500'
                        }`}
                      />
                      <span className="text-sm text-ink-500">{draft.risk}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-ink-500">{draft.reviewer}</td>
                  <td className="py-4 px-4 text-sm text-ink-500">{draft.updated}</td>
                  <td className="py-4 px-4 text-right">
                    <button className="text-ink-300 hover:text-ink-900 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
