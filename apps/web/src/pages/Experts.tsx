import React, { useState } from 'react';
import { Plus, Search, Mail, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const experts = [
  {
    id: 1,
    name: 'Dr. Emily Chen',
    role: 'Chief Technology Officer',
    readiness: 95,
    lastResponse: '2 hours ago',
    drafts: 2,
    avatar: 'user2',
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    role: 'Head of Finance',
    readiness: 80,
    lastResponse: '1 day ago',
    drafts: 1,
    avatar: 'user3',
  },
  {
    id: 3,
    name: 'Sarah Jenkins',
    role: 'VP Operations',
    readiness: 60,
    lastResponse: '3 days ago',
    drafts: 0,
    avatar: 'user4',
  },
  {
    id: 4,
    name: 'Dr. Robert Smith',
    role: 'Medical Director',
    readiness: 100,
    lastResponse: 'Just now',
    drafts: 3,
    avatar: 'user5',
  },
  {
    id: 5,
    name: 'Amanda Lee',
    role: 'Lead Designer',
    readiness: 40,
    lastResponse: '1 week ago',
    drafts: 1,
    avatar: 'user6',
  },
  {
    id: 6,
    name: 'David Kim',
    role: 'Product Manager',
    readiness: 85,
    lastResponse: '5 hours ago',
    drafts: 2,
    avatar: 'user7',
  },
];

export function Experts() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExpertName, setNewExpertName] = useState('');
  const navigate = useNavigate();

  const handleAddExpert = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddModalOpen(false);
    navigate('/app/experts/setup', { state: { name: newExpertName } });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0, duration: 0.5 } },
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Experts</h1>
          <p className="text-ink-500 mt-1">Manage your team of subject matter experts.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add expert
        </button>
      </header>

      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
          <input
            type="text"
            placeholder="Search experts..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-ink-100 bg-white focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-transparent"
          />
        </div>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {experts.map((expert) => (
          <motion.div key={expert.id} variants={item}>
            <Link
              to={`/app/experts/${expert.id}`}
              className="card flex flex-col hover:-translate-y-1 hover:shadow-md transition-all duration-300 group h-full block"
            >
              <div className="flex items-start justify-between mb-4">
                <img
                  src={`https://picsum.photos/seed/${expert.avatar}/150/150`}
                  alt={expert.name}
                  className="w-16 h-16 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-ink-100"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={
                        expert.readiness > 80
                          ? 'text-approved-600'
                          : expert.readiness > 50
                            ? 'text-warning-600'
                            : 'text-terracotta-500'
                      }
                      strokeDasharray={`${expert.readiness}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-medium text-ink-900">
                    {expert.readiness}%
                  </span>
                </div>
              </div>

              <div className="mb-6 flex-1">
                <span className="text-lg font-serif font-medium text-ink-900 group-hover:text-terracotta-600 transition-colors block">
                  {expert.name}
                </span>
                <p className="text-sm text-ink-500">{expert.role}</p>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Drafts in progress</span>
                    <span className="font-medium text-ink-900">{expert.drafts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Last response</span>
                    <span className="font-medium text-ink-900">{expert.lastResponse}</span>
                  </div>
                </div>
              </div>

              <div className="btn-secondary w-full">
                <Mail className="w-4 h-4 mr-2" />
                Request 2 minutes
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Add Expert Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-slide-sm shadow-2xl w-full max-w-lg overflow-hidden border border-ink-100"
          >
            <div className="px-6 py-5 border-b border-ink-100 flex justify-between items-center bg-beige-50">
              <h2 className="text-xl font-serif font-medium text-ink-900">Invite New Expert</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-ink-400 hover:text-ink-900 transition-colors p-1 hover:bg-ink-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpert} className="p-6 space-y-5">
              <p className="text-sm text-ink-500 mb-2">
                Send an invitation to a subject matter expert. They'll be guided through a 5-minute
                onboarding to capture their voice and expertise.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newExpertName}
                    onChange={(e) => setNewExpertName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-900 transition-shadow bg-beige-50 focus:bg-white"
                    placeholder="e.g. Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-900 transition-shadow bg-beige-50 focus:bg-white"
                    placeholder="e.g. Chief Data Officer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-900 transition-shadow bg-beige-50 focus:bg-white"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-ink-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Send Invite
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
