import React, { useState } from 'react';
import { ArrowLeft, Clock, MessageSquare, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export function DraftEditor() {
  const [activeTab, setActiveTab] = useState<'factcheck' | 'changes' | 'audit'>('factcheck');

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -m-8">
      {/* Header */}
      <header className="bg-white border-b border-ink-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link
            to="/app/drafts"
            className="p-2 hover:bg-beige-50 rounded-full transition-colors text-ink-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-serif font-medium">The Future of Remote Work</h1>
              <span className="status-pill status-review">Needs Review</span>
            </div>
            <div className="flex items-center text-sm text-ink-500 mt-1 space-x-4">
              <span>v2.1</span>
              <span>•</span>
              <span>Dr. Emily Chen</span>
              <span>•</span>
              <span className="flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" /> Due tomorrow
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">Save draft</button>
          <button className="btn-primary">Send for approval</button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Canvas */}
        <div className="flex-1 overflow-y-auto p-8 bg-beige-50">
          <div className="max-w-3xl mx-auto bg-white border border-ink-100 rounded-slide-sm shadow-sm min-h-full p-12">
            <h1 className="text-4xl font-serif font-medium mb-8">
              The Future of Remote Work: Beyond the Hybrid Model
            </h1>

            <div className="prose prose-ink max-w-none space-y-6 font-sans text-lg leading-relaxed text-ink-800">
              <p>
                As we move further into the decade, the conversation around remote work has shifted
                from "where" we work to "how" we work. The hybrid model, once seen as the ultimate
                compromise, is showing cracks.
              </p>

              <p className="bg-warning-50 -mx-2 px-2 rounded-lg border-l-4 border-warning-400">
                Recent studies indicate that 68% of employees feel disconnected in a hybrid
                environment, leading to a decrease in overall innovation.{' '}
                <span className="inline-block w-4 h-4 bg-warning-200 text-warning-700 rounded-full text-[10px] text-center leading-4 font-bold ml-1 cursor-pointer">
                  1
                </span>
              </p>

              <p>
                The solution isn't necessarily a return to the office, but rather a reimagining of
                digital workspaces. We need tools that foster serendipitous interactions—the digital
                equivalent of the water cooler conversation.
              </p>

              <h2 className="text-2xl font-serif font-medium mt-8 mb-4">Asynchronous First</h2>

              <p>
                The most successful remote teams operate asynchronously by default. This requires a
                fundamental shift in management style, moving from tracking hours to measuring
                output. It demands better documentation, clearer communication, and a high-trust
                environment.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-ink-100 flex flex-col flex-shrink-0">
          <div className="flex border-b border-ink-100 relative">
            {(['factcheck', 'changes', 'audit'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium relative transition-colors ${activeTab === tab ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div
                    layoutId="editorTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-900"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'factcheck' && (
              <div className="space-y-4">
                <div className="bg-warning-50 border border-warning-200 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <ShieldAlert className="w-5 h-5 text-warning-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-warning-900">Needs Clarification</h4>
                      <p className="text-xs text-warning-700 mt-1">
                        "68% of employees feel disconnected..."
                      </p>
                      <p className="text-xs text-ink-500 mt-2">
                        Please provide the source for this statistic. The latest internal survey
                        showed 54%.
                      </p>
                      <div className="mt-3 flex space-x-2">
                        <button className="text-xs font-medium text-warning-700 hover:text-warning-900">
                          Add source
                        </button>
                        <button className="text-xs font-medium text-ink-500 hover:text-ink-900">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-approved-50 border border-approved-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-approved-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-approved-900">Verified Claim</h4>
                      <p className="text-xs text-approved-700 mt-1">"Asynchronous by default..."</p>
                      <p className="text-xs text-ink-500 mt-1">
                        Matches expert's core voice profile guidelines.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'changes' && (
              <div className="space-y-4">
                <div className="text-center py-8 text-ink-500 text-sm">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No pending changes to review.
                </div>
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-ink-100 before:to-transparent">
                {[
                  { action: 'Sent for review', user: 'Sarah Editor', time: '2 hours ago' },
                  { action: 'Factcheck completed', user: 'System', time: '2.5 hours ago' },
                  { action: 'Draft created', user: 'Dr. Emily Chen', time: '1 day ago' },
                ].map((event, i) => (
                  <div
                    key={i}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-beige-100 text-ink-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <History className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-ink-100 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm text-ink-900">{event.action}</div>
                      </div>
                      <div className="text-xs text-ink-500">
                        {event.user} • {event.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
