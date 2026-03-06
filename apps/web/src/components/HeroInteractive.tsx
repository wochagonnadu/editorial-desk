// PATH: apps/web/src/components/HeroInteractive.tsx
// WHAT: Hero demo scene with guided editorial workflow preview
// WHY:  Lets visitors understand the product before signup without leaving hero
// RELEVANT: apps/web/src/pages/Landing.tsx,apps/web/src/components/TeamCarousel.tsx,apps/web/src/components/WorkflowInteractive.tsx

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  FileText,
  MessageSquare,
  AlertCircle,
  Check,
  Mail,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const customEase = [0.22, 1, 0.36, 1] as const;

const steps = [
  'Add Expert',
  'Voice Questions',
  'Voice Profile Ready',
  'Draft Created',
  'Weekly Content Plan',
  'Review & Edits',
  'Fact Check + Final',
];

export function HeroInteractive() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);

  const canGoBack = currentStep > 0;
  const isComplete = currentStep === steps.length - 1;

  useEffect(() => {
    if (!isActive || isPaused) return;

    const timings = [
      1500, // 0 -> 1: Add Expert (0.7-2.2s)
      2000, // 1 -> 2: Voice Questions (2.2-4.2s)
      1600, // 2 -> 3: Voice Profile (4.2-5.8s)
      1800, // 3 -> 4: Draft Created (5.8-7.6s)
      1800, // 4 -> 5: Content Plan (7.6-9.4s)
      2600, // 5 -> 6: Review & Edits (9.4-12.0s)
      2800, // 6 -> 7: Fact Check + Final (12.0-14.8s)
    ];

    let timeout: NodeJS.Timeout;

    const advanceStep = () => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) return prev;
        return prev + 1;
      });
    };

    if (currentStep === -1) {
      timeout = setTimeout(() => setCurrentStep(0), 700);
    } else if (currentStep < steps.length - 1) {
      timeout = setTimeout(advanceStep, timings[currentStep]);
    }

    return () => clearTimeout(timeout);
  }, [isActive, currentStep, isPaused]);

  const handleStart = () => {
    setIsActive(true);
    setCurrentStep(-1);
  };

  const handleReset = () => {
    setIsActive(false);
    setCurrentStep(-1);
  };

  const handleRestart = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const handleBack = () => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
  };

  return (
    <div className="w-full h-full flex items-center relative">
      <AnimatePresence>
        {/* Left Column: Text Content */}
        <motion.div
          className={`flex flex-col justify-center ${isActive ? 'w-0 opacity-0 overflow-hidden md:w-1/3 md:opacity-100 md:overflow-visible md:pr-12' : 'w-full max-w-3xl'}`}
          layout
          transition={{ duration: 0.7, ease: customEase }}
        >
          <motion.h1
            layout
            className={`${isActive ? 'text-4xl md:text-5xl' : 'text-hero'} font-serif font-medium leading-[0.85] tracking-tighter mb-4 md:mb-8 text-ink-900`}
            transition={{ duration: 0.7, ease: customEase }}
          >
            Your experts
            <br />
            have answers.
            <br />
            <span className="text-ink-400 italic">
              Your website
              <br />
              needs them.
            </span>
          </motion.h1>

          <motion.div
            layout
            className={`flex ${isActive ? 'flex-col items-start gap-6' : 'flex-col md:flex-row md:items-center gap-6'} mt-4 md:mt-8`}
            transition={{ duration: 0.7, ease: customEase }}
          >
            <motion.p
              layout
              className={`${isActive ? 'text-base' : 'text-lg md:text-xl'} text-ink-500 max-w-xl leading-relaxed font-medium`}
              transition={{ duration: 0.7, ease: customEase }}
            >
              Turn your team's knowledge into published content without the endless email threads,
              missed deadlines, and approval chaos.
            </motion.p>

            {!isActive ? (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={handleStart}
                className="btn-primary text-lg px-8 py-4 rounded-full shadow-xl shadow-ink-900/10 whitespace-nowrap"
              >
                See how it works <ArrowRight className="ml-2 w-5 h-5" />
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center gap-3"
              >
                <button
                  onClick={handleBack}
                  disabled={!canGoBack}
                  className="text-sm font-medium text-ink-500 hover:text-ink-900 disabled:text-ink-300 disabled:cursor-not-allowed transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleRestart}
                  className="text-sm font-medium text-ink-500 hover:text-ink-900 flex items-center transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Restart
                </button>
                <button
                  onClick={handleReset}
                  className="text-sm font-medium text-ink-400 hover:text-ink-900 transition-colors"
                >
                  Close demo
                </button>
                <span className="text-xs uppercase tracking-[0.18em] text-ink-400">
                  {isComplete
                    ? 'Review-ready'
                    : `Step ${Math.max(currentStep + 1, 1)} of ${steps.length}`}
                </span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Right Column: Interactive Stage */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layout
            initial={{ opacity: 0, filter: 'blur(10px)', x: 40 }}
            animate={{ opacity: 1, filter: 'blur(0px)', x: 0 }}
            exit={{ opacity: 0, filter: 'blur(10px)', x: 40 }}
            transition={{ duration: 0.7, ease: customEase, delay: 0.1 }}
            className="w-full md:w-2/3 h-[450px] md:h-[600px] bg-white rounded-[2rem] border border-ink-100 shadow-2xl shadow-ink-900/5 flex overflow-hidden relative items-center justify-center md:justify-start"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between gap-3 md:hidden">
              <div className="rounded-full bg-white/90 backdrop-blur border border-ink-200 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-500 shadow-sm">
                {isComplete
                  ? 'Review-ready'
                  : `Step ${Math.max(currentStep + 1, 1)} / ${steps.length}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  disabled={!canGoBack}
                  className="bg-white/90 backdrop-blur border border-ink-200 px-3 py-2 rounded-full shadow-sm text-xs font-medium text-ink-700 disabled:text-ink-300 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  onClick={handleRestart}
                  className="bg-white/90 backdrop-blur border border-ink-200 p-2.5 rounded-full shadow-sm text-ink-600 hover:text-ink-900"
                  aria-label="Restart demo"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scaled Wrapper for Mobile */}
            <div className="absolute md:relative w-[800px] h-[600px] origin-center md:origin-left transform scale-[0.45] sm:scale-[0.6] md:scale-100 flex">
              {/* Flow Rail (Left side of stage) */}
              <div className="w-48 flex-shrink-0 border-r border-ink-100 bg-beige-50/50 p-6 flex flex-col justify-center relative z-20">
                <div className="space-y-6 relative">
                  {/* Connecting line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-ink-200" />

                  {steps.map((step, i) => (
                    <div key={i} className="flex items-center relative z-10">
                      <div
                        className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${currentStep >= i ? 'bg-terracotta-500 border-terracotta-500 text-white' : 'bg-beige-50 border-ink-200 text-transparent'}`}
                      >
                        {currentStep > i && <CheckCircle2 className="w-3 h-3" />}
                        {currentStep === i && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span
                        className={`ml-3 text-xs font-medium transition-colors duration-500 ${currentStep >= i ? 'text-ink-900' : 'text-ink-400'}`}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Canvas Area (Right side of stage) */}
              <div className="flex-1 relative bg-beige-50/20 overflow-hidden">
                {/* Team Pulse (Always visible) */}
                <div className="absolute top-4 right-4 bg-white rounded-full shadow-sm border border-ink-100 p-1.5 pr-4 flex items-center space-x-2 z-30">
                  <img
                    src="https://picsum.photos/seed/user8/100/100"
                    className="w-6 h-6 rounded-full"
                    alt="Editor"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-ink-900 leading-none">Morgan</span>
                    <span className="text-[9px] text-ink-500 leading-none mt-0.5">
                      {currentStep >= 0 && currentStep < 6 ? 'Working...' : 'Done'}
                    </span>
                  </div>
                </div>

                {/* Step 0: Expert Profile */}
                <AnimatePresence>
                  {currentStep >= 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      animate={{
                        opacity: currentStep >= 3 ? 0.6 : 1,
                        y: 0,
                        filter: currentStep >= 3 ? 'blur(2px)' : 'blur(0px)',
                        rotate: -2,
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.5, ease: customEase }}
                      className="absolute top-12 left-12 w-64 bg-white rounded-2xl shadow-sm border border-ink-100 p-4 z-10"
                    >
                      <div className="flex items-center space-x-3 mb-3 relative">
                        <img
                          src="https://picsum.photos/seed/user2/100/100"
                          className="w-12 h-12 rounded-full"
                          alt="Expert"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-ink-900">Dr. Taylor</h4>
                          <p className="text-xs text-ink-500">Chief Medical Officer</p>
                        </div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 }}
                          className="absolute -right-2 -top-2 bg-approved-100 text-approved-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center border border-approved-200"
                        >
                          <Check className="w-2 h-2 mr-0.5" /> Added
                        </motion.div>
                      </div>
                      <div className="text-xs text-ink-500 flex items-center">
                        <Mail className="w-3 h-3 mr-1" /> taylor@clinic.com
                      </div>

                      {/* Step 2: Voice Profile Overlay */}
                      <AnimatePresence>
                        {currentStep >= 2 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.5, ease: customEase }}
                            className="mt-4 pt-4 border-t border-ink-100 overflow-hidden"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
                                Voice Profile
                              </span>
                              <span className="text-[10px] font-bold text-approved-600">
                                84% Match
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              <span className="px-2 py-1 bg-ink-100 rounded text-[9px] text-ink-700">
                                Authoritative
                              </span>
                              <span className="px-2 py-1 bg-ink-100 rounded text-[9px] text-ink-700">
                                Empathetic
                              </span>
                            </div>
                            <div className="space-y-1 mb-2">
                              <p className="text-[9px] text-ink-500 italic">
                                "In my clinical experience..."
                              </p>
                              <p className="text-[9px] text-ink-500 italic">
                                "The data clearly shows..."
                              </p>
                            </div>
                            <div className="h-1.5 w-full bg-ink-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: '72%' }}
                                animate={{ width: '84%' }}
                                transition={{ duration: 1, ease: customEase }}
                                className="h-full bg-approved-500 rounded-full"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 1: Voice Questions Email */}
                <AnimatePresence>
                  {currentStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 100, y: 20 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      exit={{ opacity: 0, x: 100, y: -50, scale: 0.8 }}
                      transition={{ duration: 0.6, ease: customEase }}
                      className="absolute top-24 right-12 w-72 bg-white rounded-xl shadow-lg border border-ink-200 overflow-hidden z-20"
                    >
                      <div className="bg-ink-900 px-4 py-2 flex justify-between items-center">
                        <span className="text-[10px] text-white font-medium">New Message</span>
                        <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.5 rounded">
                          Step 2/5
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="mb-3 border-b border-ink-100 pb-2">
                          <p className="text-[10px] text-ink-500">
                            <span className="font-medium text-ink-900">From:</span> EditorialDesk
                          </p>
                          <p className="text-[10px] text-ink-500">
                            <span className="font-medium text-ink-900">To:</span> Dr. Taylor
                          </p>
                          <p className="text-[10px] text-ink-500 mt-1">
                            <span className="font-medium text-ink-900">Subject:</span> Quick voice
                            check (2 mins)
                          </p>
                        </div>
                        <div className="text-[11px] text-ink-800 space-y-2 leading-relaxed">
                          <p>Hi Dr. Taylor,</p>
                          <p>To match your tone, could you reply with:</p>
                          <ol className="list-decimal pl-4 space-y-1 text-ink-600">
                            <li>3 phrases you often use with patients</li>
                            <li>One sentence you'd never say</li>
                          </ol>
                          <p>Thanks - your editorial desk.</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-ink-100 flex justify-between items-center">
                          <span className="text-[9px] text-ink-400">Takes ~2 mins</span>
                          <button className="bg-ink-100 text-ink-900 text-[10px] font-medium px-3 py-1.5 rounded-md">
                            Reply with 3 phrases
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reply Bubble */}
                <AnimatePresence>
                  {currentStep === 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.8 }}
                      transition={{ delay: 1.2, duration: 0.4, ease: customEase }}
                      className="absolute top-16 right-24 bg-terracotta-100 text-terracotta-900 text-[10px] px-3 py-2 rounded-xl rounded-br-sm shadow-sm z-30 border border-terracotta-200"
                    >
                      "I always tell patients..."
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Inbox Stack (Appears when email flies away) */}
                <AnimatePresence>
                  {currentStep >= 2 && currentStep < 5 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-12 right-12 w-16 h-12 z-10"
                    >
                      <div className="absolute inset-0 bg-white border border-ink-200 rounded-lg shadow-sm transform rotate-6 translate-x-2 translate-y-2" />
                      <div className="absolute inset-0 bg-white border border-ink-200 rounded-lg shadow-sm transform -rotate-3 -translate-x-1 translate-y-1" />
                      <div className="absolute inset-0 bg-white border border-ink-200 rounded-lg shadow-sm flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-ink-400" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 3: Draft Created (Draft v1 Email) */}
                <AnimatePresence>
                  {currentStep >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 40, scale: 0.95 }}
                      animate={{
                        opacity: currentStep >= 5 ? 0.6 : 1,
                        y: currentStep >= 4 ? 140 : 0, // Move down when plan appears
                        scale: currentStep >= 5 ? 0.95 : 1,
                        x: currentStep >= 5 ? -20 : 0,
                        rotate: 2,
                        filter: currentStep >= 5 ? 'blur(2px)' : 'blur(0px)',
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: customEase }}
                      className={`absolute top-12 right-32 w-80 bg-white rounded-xl shadow-lg border border-ink-200 z-20 ${currentStep >= 5 ? 'z-10' : 'z-20'}`}
                    >
                      <div className="bg-ink-900 px-4 py-2 flex justify-between items-center rounded-t-xl">
                        <span className="text-[10px] text-white font-medium">New Message</span>
                      </div>
                      <div className="p-4">
                        <div className="mb-3 border-b border-ink-100 pb-2">
                          <p className="text-[10px] text-ink-500">
                            <span className="font-medium text-ink-900">From:</span> EditorialDesk
                          </p>
                          <p className="text-[10px] text-ink-500">
                            <span className="font-medium text-ink-900">To:</span> Dr. Taylor
                          </p>
                          <p className="text-[10px] text-ink-500 mt-1">
                            <span className="font-medium text-ink-900">Subject:</span> Draft v1
                            ready for review
                          </p>
                        </div>
                        <div className="text-[11px] text-ink-800 mb-3 space-y-2">
                          <p>Hi Dr. Taylor,</p>
                          <p>
                            The first draft is ready. Please review and add your comments directly
                            in the document.
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 p-2 border border-ink-200 rounded-lg bg-beige-50">
                          <FileText className="w-4 h-4 text-ink-400" />
                          <span className="text-[10px] font-bold text-ink-900">Draft_v1.docx</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Revision v2 (Appears in Step 5) */}
                <AnimatePresence>
                  {currentStep >= 5 && (
                    <motion.div
                      initial={{ opacity: 0, y: 160, x: 20 }}
                      animate={{ opacity: 1, y: 140, x: 0, rotate: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: customEase }}
                      className="absolute top-12 right-32 w-[340px] bg-white rounded-xl shadow-2xl border border-ink-200 z-30"
                    >
                      {/* Document Header */}
                      <div className="border-b border-ink-100 px-5 py-3 flex justify-between items-center bg-beige-50 rounded-t-xl">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-ink-400" />
                          <span className="text-xs font-bold text-ink-900">Draft v2.docx</span>
                        </div>
                        <span className="bg-warning-100 text-warning-700 text-[9px] font-bold px-2 py-1 rounded-full border border-warning-200">
                          Needs Review
                        </span>
                      </div>
                      <div className="p-6 relative">
                        <div className="space-y-4">
                          <div className="h-5 w-3/4 bg-ink-100 rounded" />
                          <div className="space-y-2">
                            <div className="h-2 w-full bg-ink-50 rounded" />
                            <div className="h-2 w-full bg-ink-50 rounded" />

                            {/* Highlighted sentence with comment */}
                            <div className="h-2 w-full bg-warning-100 rounded relative">
                              {/* Comment block */}
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute -right-32 -top-4 w-32 bg-white border border-ink-200 shadow-lg rounded-lg p-2 z-40"
                              >
                                <div className="flex items-center space-x-1 mb-1">
                                  <MessageSquare className="w-3 h-3 text-ink-400" />
                                  <span className="text-[9px] font-bold text-ink-900">Morgan</span>
                                </div>
                                <p className="text-[8px] text-ink-500 leading-tight">
                                  Added more context here.
                                </p>
                              </motion.div>
                            </div>
                            <div className="h-2 w-5/6 bg-ink-50 rounded" />
                          </div>

                          {/* Factcheck highlight (Step 6) */}
                          <div className="space-y-2 relative mt-4">
                            <motion.div
                              animate={{
                                backgroundColor: currentStep === 6 ? '#fdf3e1' : '#f9fafb', // warning-100 or ink-50
                              }}
                              className="h-2 w-full rounded transition-colors duration-500"
                            />
                            <div className="h-2 w-4/5 bg-ink-50 rounded" />

                            {/* Factcheck Tooltip */}
                            <AnimatePresence>
                              {currentStep === 6 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="absolute -right-32 top-0 w-28 bg-white border border-warning-200 shadow-lg rounded-lg p-2 z-40"
                                >
                                  <div className="flex items-center space-x-1 mb-1">
                                    <AlertCircle className="w-3 h-3 text-warning-600" />
                                    <span className="text-[9px] font-bold text-warning-900">
                                      Rewrite
                                    </span>
                                  </div>
                                  <p className="text-[8px] text-ink-500 leading-tight">
                                    Claim softened for safety.
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Final Stamp */}
                        <AnimatePresence>
                          {currentStep === 6 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 2, rotate: -10 }}
                              animate={{ opacity: 1, scale: 1, rotate: -10 }}
                              transition={{ delay: 1.5, type: 'spring', bounce: 0.5 }}
                              className="absolute inset-0 m-auto w-36 h-12 border-4 border-approved-500 text-approved-500 flex items-center justify-center text-sm font-bold uppercase tracking-widest rounded-lg bg-white/90 backdrop-blur-sm z-50 shadow-xl"
                            >
                              Review-Ready
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 4: Content Plan Proposal */}
                <AnimatePresence>
                  {currentStep >= 4 && (
                    <motion.div
                      initial={{ opacity: 0, x: -40 }}
                      animate={{
                        opacity: currentStep >= 6 ? 0.6 : 1,
                        x: 0,
                        rotate: -1,
                        filter: currentStep >= 6 ? 'blur(2px)' : 'blur(0px)',
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: customEase }}
                      className="absolute top-64 left-12 w-64 bg-white rounded-xl shadow-sm border border-ink-100 p-4 z-10"
                    >
                      <h4 className="text-xs font-bold text-ink-900 mb-3 uppercase tracking-wider">
                        Weekly Plan
                      </h4>
                      <div className="space-y-2">
                        <motion.div
                          animate={{
                            y: currentStep === 4 ? -120 : 0,
                            x: currentStep === 4 ? 120 : 0,
                            opacity: currentStep === 4 ? 0 : 1,
                          }}
                          transition={{ delay: 1, duration: 0.8, ease: customEase }}
                          className="p-2 bg-beige-50 rounded border border-ink-100 text-[10px] text-ink-700 font-medium relative"
                        >
                          1. Future of Telehealth
                          {currentStep === 4 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 1.5 }}
                              className="absolute -right-2 -top-2 bg-approved-100 text-approved-600 text-[8px] px-1 rounded-full border border-approved-200"
                            >
                              Approved
                            </motion.div>
                          )}
                        </motion.div>
                        <div className="p-2 bg-beige-50 rounded border border-ink-100 text-[10px] text-ink-700 font-medium">
                          2. Patient Care in 2025
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 6: Factcheck Card */}
                <AnimatePresence>
                  {currentStep === 6 && (
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0, rotate: -2 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: customEase }}
                      className="absolute bottom-12 left-12 w-48 bg-white rounded-xl shadow-lg border border-ink-200 p-4 z-40"
                    >
                      <h4 className="text-xs font-bold text-ink-900 mb-2">Factcheck Report</h4>
                      <div className="space-y-2 text-[10px]">
                        <div className="flex justify-between text-ink-600">
                          <span>Claims found:</span>
                          <span className="font-bold text-ink-900">6</span>
                        </div>
                        <div className="flex justify-between text-approved-600">
                          <span>Verified:</span>
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-bold"
                          >
                            5
                          </motion.span>
                        </div>
                        <div className="flex justify-between text-warning-600">
                          <span>Needs rewrite:</span>
                          <span className="font-bold">1</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
