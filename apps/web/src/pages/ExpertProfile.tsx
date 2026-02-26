import React from 'react';
import {
  ArrowLeft,
  Mail,
  FileText,
  AlertCircle,
  Sparkles,
  Lightbulb,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export function ExpertProfile() {
  // Mock data
  const expert = {
    name: 'Dr. Emily Chen',
    role: 'Chief Technology Officer',
    readiness: 95,
    avatar: 'user2',
    aiAnalysis: {
      background:
        'A leading voice in enterprise technology architecture with over 15 years of experience scaling distributed systems.',
      tone: 'Authoritative yet accessible. Uses concrete analogies to explain complex technical concepts. Avoids deep jargon when addressing business stakeholders, but maintains technical rigor.',
      vocabulary:
        'Frequently uses terms like "resilience", "scalable infrastructure", "technical debt", and "future-proofing".',
      disclaimers:
        'Always add a disclaimer about forward-looking statements when discussing future tech trends or unreleased features.',
    },
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0, duration: 0.4 } },
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <Link
        to="/app/experts"
        className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Experts
      </Link>

      {/* Top Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <img
              src={`https://picsum.photos/seed/${expert.avatar}/200/200`}
              alt={expert.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
              <div className="bg-approved-100 text-approved-700 text-[10px] font-bold px-2 py-1 rounded-full border border-approved-200 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                VOICE READY
              </div>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-serif font-medium tracking-tight text-ink-900">
              {expert.name}
            </h1>
            <p className="text-ink-500 text-lg mt-1">{expert.role}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">
            <Mail className="w-4 h-4 mr-2" />
            Message
          </button>
          <button className="btn-primary">Start new draft</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* AI Voice Analysis */}
          <section className="card relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-info-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="flex items-center space-x-2 mb-6 relative z-10">
              <Sparkles className="w-5 h-5 text-info-600" />
              <h2 className="text-xl font-serif font-medium">AI Voice Analysis</h2>
            </div>

            <div className="space-y-6 relative z-10">
              <div>
                <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">
                  Background & Expertise
                </h3>
                <p className="text-ink-800 leading-relaxed">{expert.aiAnalysis.background}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">
                    Tone & Style
                  </h3>
                  <p className="text-ink-800 leading-relaxed">{expert.aiAnalysis.tone}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider mb-2">
                    Key Vocabulary
                  </h3>
                  <p className="text-ink-800 leading-relaxed">{expert.aiAnalysis.vocabulary}</p>
                </div>
              </div>

              <div className="bg-warning-50 rounded-2xl p-4 border border-warning-200 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-warning-900">Required Disclaimers</h3>
                  <p className="text-sm text-warning-800 mt-1">{expert.aiAnalysis.disclaimers}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Current Drafts */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-medium">Current Drafts</h2>
              <Link
                to="/app/drafts"
                className="text-sm font-medium text-ink-500 hover:text-ink-900"
              >
                View all
              </Link>
            </div>
            <div className="card p-0 overflow-hidden">
              <motion.ul
                variants={container}
                initial="hidden"
                animate="show"
                className="divide-y divide-ink-100"
              >
                {[
                  {
                    title: 'The Future of Remote Work',
                    status: 'Needs Review',
                    updated: '2 hours ago',
                  },
                  {
                    title: 'Scaling Microservices in 2024',
                    status: 'Factcheck',
                    updated: '1 day ago',
                  },
                ].map((draft, i) => (
                  <motion.li
                    key={i}
                    variants={item}
                    className="p-4 hover:bg-beige-50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-white rounded-xl border border-ink-100 shadow-sm group-hover:border-ink-300 transition-colors">
                        <FileText className="w-5 h-5 text-ink-400" />
                      </div>
                      <div>
                        <p className="font-medium text-ink-900 group-hover:text-terracotta-600 transition-colors">
                          {draft.title}
                        </p>
                        <div className="flex items-center text-sm text-ink-500 mt-1 space-x-2">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Updated {draft.updated}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`status-pill ${draft.status === 'Needs Review' ? 'status-review' : 'status-factcheck'}`}
                    >
                      {draft.status}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>

          {/* Published Articles */}
          <section>
            <h2 className="text-xl font-serif font-medium mb-4">Published Articles</h2>
            <div className="card p-0 overflow-hidden">
              <motion.ul
                variants={container}
                initial="hidden"
                animate="show"
                className="divide-y divide-ink-100"
              >
                {[
                  {
                    title: 'Why Technical Debt is Actually a Financial Metric',
                    date: 'Oct 15, 2023',
                    reads: '12.4k',
                  },
                  {
                    title: 'The Ethics of AI in Enterprise Software',
                    date: 'Sep 28, 2023',
                    reads: '8.2k',
                  },
                  {
                    title: 'Building Resilient Teams in a Distributed World',
                    date: 'Aug 10, 2023',
                    reads: '15.1k',
                  },
                ].map((article, i) => (
                  <motion.li
                    key={i}
                    variants={item}
                    className="p-4 hover:bg-beige-50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-ink-900 group-hover:text-terracotta-600 transition-colors">
                        {article.title}
                      </p>
                      <div className="flex items-center text-sm text-ink-500 mt-1 space-x-3">
                        <span>Published {article.date}</span>
                        <span>•</span>
                        <span>{article.reads} reads</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-ink-300 group-hover:text-ink-900 transition-colors" />
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </section>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-8">
          {/* Topic Suggestions */}
          <section className="card bg-ink-900 text-white border-none shadow-xl">
            <div className="flex items-center space-x-2 mb-6">
              <Lightbulb className="w-5 h-5 text-warning-400" />
              <h2 className="text-xl font-serif font-medium">Topic Suggestions</h2>
            </div>
            <p className="text-ink-300 text-sm mb-6 leading-relaxed">
              Based on Dr. Chen's expertise and current industry trends, the AI suggests these
              topics for her next article:
            </p>
            <div className="space-y-4">
              {[
                {
                  title: 'The Hidden Costs of Cloud Migration',
                  reason:
                    'Trending topic in enterprise tech; aligns with her focus on infrastructure.',
                },
                {
                  title: 'AI Governance Frameworks for 2024',
                  reason: 'High search volume; builds on her previous ethics article.',
                },
                {
                  title: 'Balancing Innovation with Security',
                  reason: 'Evergreen topic; matches her authoritative tone.',
                },
              ].map((suggestion, i) => (
                <div
                  key={i}
                  className="bg-ink-800 rounded-2xl p-4 border border-ink-700 hover:border-ink-500 transition-colors cursor-pointer group"
                >
                  <h3 className="font-medium text-white group-hover:text-warning-400 transition-colors">
                    {suggestion.title}
                  </h3>
                  <p className="text-xs text-ink-400 mt-2 leading-relaxed">{suggestion.reason}</p>
                  <button className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-300 group-hover:text-white flex items-center transition-colors">
                    Start Draft <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Source Samples */}
          <section className="card space-y-4">
            <h2 className="text-lg font-serif font-medium border-b border-ink-100 pb-3">
              Training Sources
            </h2>
            <p className="text-sm text-ink-500 mb-2">Materials used to train this voice profile.</p>
            <div className="space-y-2">
              <div className="p-3 bg-beige-50 rounded-xl text-sm font-medium text-ink-900 flex items-center group cursor-pointer hover:bg-ink-100 transition-colors">
                <FileText className="w-4 h-4 mr-3 text-ink-400 group-hover:text-ink-900" />
                Keynote_Speech_2023.pdf
              </div>
              <div className="p-3 bg-beige-50 rounded-xl text-sm font-medium text-ink-900 flex items-center group cursor-pointer hover:bg-ink-100 transition-colors">
                <FileText className="w-4 h-4 mr-3 text-ink-400 group-hover:text-ink-900" />
                Blog_Posts_Archive.docx
              </div>
              <div className="p-3 bg-beige-50 rounded-xl text-sm font-medium text-ink-900 flex items-center group cursor-pointer hover:bg-ink-100 transition-colors">
                <FileText className="w-4 h-4 mr-3 text-ink-400 group-hover:text-ink-900" />
                Podcast_Transcript_Q2.txt
              </div>
            </div>
            <button className="btn-secondary w-full text-sm mt-2">Upload more samples</button>
          </section>
        </div>
      </div>
    </div>
  );
}
