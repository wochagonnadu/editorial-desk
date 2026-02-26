import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'motion/react';

const steps = [
  {
    title: 'Topic Idea',
    desc: 'capturing raw expert thinking',
    leftTitle: 'A calm,\npredictable\nworkflow.',
    leftDesc:
      'From raw idea to approved draft without leaving your inbox. Every step is tracked, versioned, and accountable.',
  },
  {
    title: 'AI Drafting',
    desc: 'structuring into clear narrative',
    leftTitle: 'Drafts that\nsound like you.',
    leftDesc:
      'Our AI studies your past content and voice profile to create a structured narrative that feels authentic.',
  },
  {
    title: 'Automated Factcheck',
    desc: 'verifying claims automatically',
    leftTitle: 'Nothing ships\nwithout verification.',
    leftDesc:
      'Every claim, statistic, and medical fact is cross-referenced against your approved knowledge base.',
  },
  {
    title: 'Expert Review',
    desc: 'ensuring authentic voice',
    leftTitle: 'Review in minutes,\nnot hours.',
    leftDesc:
      'Experts get a clean, highlighted document. They just add comments where needed, and we handle the rest.',
  },
  {
    title: 'Final Approval',
    desc: 'ready for publishing',
    leftTitle: 'Ready to\npublish.',
    leftDesc:
      'A final, polished piece of content, fact-checked, formatted, and ready for your CMS.',
  },
];

export function WorkflowInteractive() {
  const [currentStep, setCurrentStep] = useState(0);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: '-20%' });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-play logic
  useEffect(() => {
    if (!isInView || !isAutoPlaying || currentStep >= 4) return;

    const timeout = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 4000); // Time matches typing duration + pause

    return () => clearTimeout(timeout);
  }, [isInView, isAutoPlaying, currentStep]);

  const activeIdx = currentStep;
  const displayContent = steps[currentStep];

  return (
    <div
      ref={containerRef}
      className="grid md:grid-cols-2 gap-4 md:gap-24 items-center relative z-10"
    >
      {/* Left Column */}
      <div className="relative z-[100]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={{
              hidden: { opacity: 1 },
              visible: { opacity: 1 },
              exit: {
                x: -40,
                opacity: 0,
                filter: 'blur(8px)',
                transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            <motion.h2
              className="text-3xl md:text-6xl font-serif font-medium mb-4 md:mb-6 tracking-tight text-beige-50 whitespace-pre-wrap"
              variants={{
                hidden: { opacity: 1 },
                visible: { opacity: 1, transition: { staggerChildren: 0.015 } },
              }}
            >
              {displayContent.leftTitle.split('').map((char, i) => (
                <motion.span
                  key={`title-${i}`}
                  variants={{
                    hidden: { opacity: 0, filter: 'blur(8px)' },
                    visible: { opacity: 1, filter: 'blur(0px)' },
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.h2>
            <motion.p
              className="text-sm md:text-xl text-ink-400 leading-relaxed max-w-md whitespace-pre-wrap"
              variants={{
                hidden: { opacity: 1 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.015,
                    delayChildren: displayContent.leftTitle.length * 0.015 + 0.2,
                  },
                },
              }}
            >
              {displayContent.leftDesc.split('').map((char, i) => (
                <motion.span
                  key={`desc-${i}`}
                  variants={{
                    hidden: { opacity: 0, filter: 'blur(8px)' },
                    visible: { opacity: 1, filter: 'blur(0px)' },
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Column: Editorial Stack */}
      <div className="relative h-[320px] md:h-[560px] w-full mt-2 md:mt-0">
        {/* Scrubber Navigation */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 px-2 items-center">
          {steps.map((_, i) => {
            const distance = Math.abs(currentStep - i);
            let scrubberClass = 'h-1.5 bg-ink-700 hover:bg-ink-400';
            if (distance === 0) {
              scrubberClass = 'h-8 bg-beige-50 shadow-[0_0_10px_rgba(255,255,255,0.5)]';
            } else if (distance === 1) {
              scrubberClass = 'h-4 bg-ink-500 hover:bg-ink-400';
            }

            return (
              <button
                key={i}
                onClick={() => {
                  setCurrentStep(i);
                  setIsAutoPlaying(false);
                }}
                className={`w-1.5 rounded-full transition-all duration-500 ${scrubberClass}`}
                aria-label={`Go to step ${i + 1}`}
              />
            );
          })}
        </div>

        {steps.map((step, i) => {
          const offset = i - activeIdx;
          const isActive = offset === 0;
          const isFinal = i === 4;
          const isFinalActive = isFinal && isActive;

          // Calculate stack positioning and effects (Bidirectional)
          const yOffsetBase = isMobile ? 24 : 40;
          let y = offset * yOffsetBase; // Vertical stack offset (past goes up, future goes down)
          let scale = 1 - Math.abs(offset) * 0.05;
          let opacity = isActive ? 1 : Math.max(0.15, 1 - Math.abs(offset) * 0.2);
          const zIndex = 50 - Math.abs(offset); // Active is always on top
          let blur = isActive ? 0 : Math.abs(offset) * 1.5;

          // Hover peek effect
          if (hoveredStep === i && !isActive) {
            y = offset * yOffsetBase + (offset > 0 ? (isMobile ? 10 : 15) : isMobile ? -10 : -15);
            opacity = Math.min(1, opacity + 0.2);
            blur = Math.max(0, blur - 1);
            scale = scale + 0.02;
          }

          return (
            <motion.div
              key={i}
              onClick={() => {
                setCurrentStep(i);
                setIsAutoPlaying(false);
              }}
              onMouseEnter={() => {
                setHoveredStep(i);
              }}
              onMouseLeave={() => {
                setHoveredStep(null);
              }}
              animate={{
                y,
                scale,
                opacity,
                filter: `blur(${blur}px)`,
                zIndex: isActive ? 60 : zIndex,
              }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={`absolute top-[20px] md:top-[110px] left-0 right-8 md:right-12 h-[220px] md:h-[340px] p-5 md:p-10 rounded-2xl md:rounded-[2rem] border backdrop-blur-xl flex flex-col shadow-2xl transition-colors duration-500 ${
                isFinalActive
                  ? 'bg-approved-900/20 border-approved-500/30'
                  : isActive
                    ? 'bg-ink-800/95 border-white/10'
                    : 'bg-ink-800/50 border-white/10'
              }`}
              style={{
                transformOrigin: 'center center',
                cursor: isActive ? 'default' : 'pointer',
              }}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4 md:mb-10">
                <div
                  className={`text-lg md:text-2xl font-serif ${isFinalActive ? 'text-approved-500' : isActive ? 'text-beige-50' : 'text-ink-500'}`}
                >
                  0{i + 1}
                </div>
                <div
                  className={`text-[9px] md:text-xs font-medium uppercase tracking-widest px-2 py-1 md:px-3 md:py-1.5 rounded-full border transition-colors duration-500 ${
                    isFinalActive
                      ? 'bg-approved-500/10 border-approved-500/20 text-approved-400'
                      : isActive
                        ? 'bg-white/5 border-white/10 text-beige-50'
                        : 'bg-transparent border-transparent text-ink-500'
                  }`}
                >
                  {isFinalActive ? 'Ready to Publish' : isActive ? 'In Progress' : 'Pending'}
                </div>
              </div>

              {/* Card Body */}
              <div>
                <h3
                  className={`text-xl md:text-4xl font-serif font-medium mb-2 md:mb-4 transition-colors duration-500 ${isFinalActive ? 'text-white' : isActive ? 'text-white' : 'text-ink-300'}`}
                >
                  {step.title}
                </h3>
                <p
                  className={`text-xs md:text-base transition-colors duration-500 ${isFinalActive ? 'text-ink-300' : isActive ? 'text-ink-300' : 'text-ink-500'}`}
                >
                  {step.desc}
                </p>
              </div>

              {/* Document Skeleton Lines (Bottom) */}
              <div className="mt-auto space-y-3 opacity-40">
                <div
                  className={`h-2 rounded-full w-3/4 transition-colors duration-500 ${isFinalActive ? 'bg-approved-500/40' : 'bg-white/20'}`}
                />
                <div
                  className={`h-2 rounded-full w-full transition-colors duration-500 ${isFinalActive ? 'bg-approved-500/40' : 'bg-white/20'}`}
                />
                <div
                  className={`h-2 rounded-full w-5/6 transition-colors duration-500 ${isFinalActive ? 'bg-approved-500/40' : 'bg-white/20'}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
