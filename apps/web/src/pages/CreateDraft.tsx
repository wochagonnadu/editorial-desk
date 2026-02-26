import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Target,
  FileText,
  MessageSquare,
  Link as LinkIcon,
  Calendar,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const experts = [
  { id: 1, name: 'Dr. Emily Chen', role: 'Chief Technology Officer' },
  { id: 2, name: 'Marcus Johnson', role: 'Head of Finance' },
  { id: 3, name: 'Sarah Jenkins', role: 'VP Operations' },
];

const positionings = [
  {
    id: 'visionary',
    name: 'Visionary / Thought Leader',
    desc: 'Focus on future trends and big-picture ideas.',
  },
  {
    id: 'pragmatic',
    name: 'Pragmatic / Action-Oriented',
    desc: 'Step-by-step guides, frameworks, and practical advice.',
  },
  {
    id: 'academic',
    name: 'Academic / Data-Driven',
    desc: 'Research-backed insights, statistics, and deep analysis.',
  },
];

export function CreateDraft() {
  const navigate = useNavigate();
  const [selectedExpert, setSelectedExpert] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedPositioning, setSelectedPositioning] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategyGenerated, setStrategyGenerated] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpert || !keyword || !selectedPositioning) return;

    setIsGenerating(true);
    // Simulate AI generation delay
    setTimeout(() => {
      setIsGenerating(false);
      setStrategyGenerated(true);
    }, 2000);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0, duration: 0.5 } },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <Link
        to="/app/drafts"
        className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Drafts
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-medium tracking-tight text-ink-900">
            Content Strategy Builder
          </h1>
          <p className="text-ink-500 text-lg mt-1">
            Generate a 12-week content cluster for your expert.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 space-y-6">
          <form onSubmit={handleGenerate} className="card space-y-8 sticky top-8">
            {/* 1. Select Expert */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider">
                1. Select Expert
              </label>
              <div className="space-y-2">
                {experts.map((expert) => (
                  <div
                    key={expert.id}
                    onClick={() => setSelectedExpert(expert.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedExpert === expert.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 bg-white text-ink-900'}`}
                  >
                    <p className="font-medium">{expert.name}</p>
                    <p
                      className={`text-xs ${selectedExpert === expert.id ? 'text-ink-300' : 'text-ink-500'}`}
                    >
                      {expert.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Keyword / Topic */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider">
                2. Core Keyword / Topic
              </label>
              <input
                type="text"
                required
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-900 transition-shadow bg-beige-50 focus:bg-white"
                placeholder="e.g. Enterprise AI Adoption"
              />
            </div>

            {/* 3. Positioning */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-ink-500 uppercase tracking-wider">
                3. Brand Positioning
              </label>
              <div className="space-y-2">
                {positionings.map((pos) => (
                  <div
                    key={pos.id}
                    onClick={() => setSelectedPositioning(pos.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedPositioning === pos.id ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 hover:border-ink-400 bg-white text-ink-900'}`}
                  >
                    <p className="font-medium text-sm">{pos.name}</p>
                    <p
                      className={`text-xs mt-1 leading-relaxed ${selectedPositioning === pos.id ? 'text-ink-300' : 'text-ink-500'}`}
                    >
                      {pos.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedExpert || !keyword || !selectedPositioning || isGenerating}
              className="btn-primary w-full flex items-center justify-center py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                  Generating Strategy...
                </span>
              ) : (
                <span className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Content Plan
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Generated Strategy */}
        <div className="lg:col-span-8">
          {!strategyGenerated && !isGenerating && (
            <div className="h-full min-h-[400px] border-2 border-dashed border-ink-200 rounded-slide-sm flex flex-col items-center justify-center text-center p-12 bg-white/50">
              <div className="w-16 h-16 bg-beige-100 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-ink-400" />
              </div>
              <h3 className="text-xl font-serif font-medium text-ink-900 mb-2">
                Ready to build your strategy
              </h3>
              <p className="text-ink-500 max-w-md">
                Select an expert, enter a core topic, and choose your positioning to generate a
                comprehensive 12-week content cluster.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="h-full min-h-[400px] border border-ink-100 rounded-slide-sm flex flex-col items-center justify-center text-center p-12 bg-white shadow-sm">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-beige-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-ink-900 rounded-full border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-ink-900 animate-pulse" />
              </div>
              <h3 className="text-xl font-serif font-medium text-ink-900 mb-2">
                Analyzing search intent...
              </h3>
              <p className="text-ink-500">Structuring pillar and cluster topics for "{keyword}"</p>
            </div>
          )}

          {strategyGenerated && !isGenerating && (
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
              {/* 1. Pillar Article */}
              <motion.section
                variants={item}
                className="card relative overflow-hidden border-ink-900 shadow-md"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-info-100 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="bg-ink-900 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      SEO Pillar (Hub)
                    </span>
                  </div>
                  <h2 className="text-3xl font-serif font-medium text-ink-900 mb-3">
                    The Ultimate Guide to {keyword}
                  </h2>
                  <p className="text-ink-600 leading-relaxed mb-6">
                    A comprehensive 3,000+ word hub article that covers all foundational aspects of
                    the topic. This will serve as the central node for all supporting content.
                  </p>
                  <button onClick={() => navigate('/app/drafts/new')} className="btn-primary">
                    Start Pillar Draft
                  </button>
                </div>
              </motion.section>

              {/* 2. Clusters */}
              <motion.section variants={item} className="card space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-5 h-5 text-ink-400" />
                  <h2 className="text-xl font-serif font-medium">
                    Cluster Articles (Demand-Driven)
                  </h2>
                </div>
                <p className="text-sm text-ink-500 mb-4">
                  10 supporting articles targeting specific long-tail keywords and user intent.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    `How to implement ${keyword} in 2024`,
                    `Top 5 mistakes when adopting ${keyword}`,
                    `${keyword} vs Traditional Methods`,
                    `The ROI of ${keyword} for Enterprise`,
                    `Security implications of ${keyword}`,
                    `Building a team for ${keyword}`,
                    `Case Study: ${keyword} in Finance`,
                    `Future trends in ${keyword}`,
                    `A beginner's guide to ${keyword} tools`,
                    `Measuring success with ${keyword}`,
                  ].map((title, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-ink-100 hover:border-ink-300 hover:shadow-sm transition-all bg-beige-50 group cursor-pointer flex items-start justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-ink-400 mb-1 block">
                          CLUSTER {i + 1}
                        </span>
                        <h4 className="font-medium text-ink-900 group-hover:text-terracotta-600 transition-colors">
                          {title}
                        </h4>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-ink-900 transition-colors mt-1" />
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* 3. Quick FAQs */}
              <motion.section variants={item} className="card space-y-4">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-ink-400" />
                  <h2 className="text-xl font-serif font-medium">Quick FAQ-Posts (For Snippets)</h2>
                </div>
                <p className="text-sm text-ink-500 mb-4">
                  Short, highly-optimized answers designed to capture Google Featured Snippets and
                  LinkedIn posts.
                </p>

                <div className="space-y-3">
                  {[
                    `What is the main benefit of ${keyword}?`,
                    `How long does it take to see results from ${keyword}?`,
                    `Is ${keyword} suitable for small businesses?`,
                  ].map((faq, i) => (
                    <div
                      key={i}
                      className="flex items-start space-x-3 p-3 bg-white border border-ink-100 rounded-xl"
                    >
                      <div className="w-6 h-6 rounded-full bg-info-100 text-info-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        Q
                      </div>
                      <p className="font-medium text-ink-900">{faq}</p>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* 4. Interlinking & Rhythm */}
              <div className="grid md:grid-cols-2 gap-6">
                <motion.section
                  variants={item}
                  className="card space-y-4 bg-ink-900 text-white border-none"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <LinkIcon className="w-5 h-5 text-warning-400" />
                    <h2 className="text-xl font-serif font-medium">Interlinking Strategy</h2>
                  </div>
                  <ul className="space-y-3 text-sm text-ink-300">
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-warning-400 flex-shrink-0 mt-0.5" />
                      All 10 cluster articles must link back to the Pillar Article using exact-match
                      anchor text.
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-warning-400 flex-shrink-0 mt-0.5" />
                      Pillar article links out to clusters contextually when expanding on
                      sub-topics.
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-warning-400 flex-shrink-0 mt-0.5" />
                      FAQs link to their respective deep-dive cluster articles.
                    </li>
                  </ul>
                </motion.section>

                <motion.section variants={item} className="card space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-5 h-5 text-ink-400" />
                    <h2 className="text-xl font-serif font-medium">12-Week Rhythm</h2>
                  </div>
                  <div className="relative pl-4 border-l-2 border-ink-100 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-terracotta-500 ring-4 ring-white" />
                      <p className="text-xs font-bold text-ink-400 uppercase">Weeks 1-2</p>
                      <p className="text-sm font-medium text-ink-900">
                        Publish Pillar Article & Initial FAQs
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-ink-300 ring-4 ring-white" />
                      <p className="text-xs font-bold text-ink-400 uppercase">Weeks 3-10</p>
                      <p className="text-sm font-medium text-ink-900">
                        Publish 1-2 Cluster Articles weekly
                      </p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-ink-300 ring-4 ring-white" />
                      <p className="text-xs font-bold text-ink-400 uppercase">Weeks 11-12</p>
                      <p className="text-sm font-medium text-ink-900">
                        Content Refresh & Social Distribution
                      </p>
                    </div>
                  </div>
                </motion.section>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
