import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';

const teamMembers = [
  {
    id: 'morgan',
    name: 'Morgan',
    role: 'Editor-in-Chief',
    quote: 'I decide what goes to production.',
    image: 'user8',
  },
  {
    id: 'casey',
    name: 'Casey',
    role: 'The Interviewer',
    quote: "I capture the expert's voice in 2 minutes.",
    image: 'user2',
  },
  {
    id: 'rowan',
    name: 'Rowan',
    role: 'Voice Stylist',
    quote: 'I make sure it sounds exactly like them.',
    image: 'user3',
  },
  {
    id: 'blair',
    name: 'Blair',
    role: 'Structure Editor',
    quote: 'I build the draft into a clear structure.',
    image: 'user4',
  },
  {
    id: 'avery',
    name: 'Avery',
    role: 'Fact Checker',
    quote: 'I catch the factual holes.',
    image: 'user5',
  },
  {
    id: 'jordan',
    name: 'Jordan',
    role: 'Compliance Officer',
    quote: 'I ensure every claim is safe and honest.',
    image: 'user6',
  },
  {
    id: 'sam',
    name: 'Sam',
    role: 'The Polisher',
    quote: 'I remove the corporate fluff.',
    image: 'user7',
  },
  {
    id: 'quinn',
    name: 'Quinn',
    role: 'Revision Coordinator',
    quote: 'I merge all edits into one clean version.',
    image: 'user9',
  },
  {
    id: 'taylor',
    name: 'Taylor',
    role: 'Quality Gatekeeper',
    quote: 'I give the final green light.',
    image: 'user1',
  },
];

export function TeamCarousel() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close active card on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (carouselRef.current && !carouselRef.current.contains(event.target as Node)) {
        setActiveId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full relative" ref={carouselRef}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `,
        }}
      />

      {/* 
        The padding-left calculation ensures the carousel aligns with the max-w-7xl container 
        (which is 80rem or 1280px wide) while allowing the cards to bleed off the right edge.
      */}
      <div className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-12 pt-4 px-6 md:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] md:pr-6 hide-scrollbar">
        {teamMembers.map((member) => {
          const isActive = activeId === member.id || hoveredId === member.id;

          return (
            <motion.div
              key={member.id}
              className={`relative flex-shrink-0 w-[260px] md:w-[300px] snap-start group cursor-pointer rounded-[2rem] p-3 transition-colors duration-500 border ${isActive ? 'bg-beige-50 border-ink-200' : 'bg-transparent border-transparent hover:border-ink-100'}`}
              onClick={() => setActiveId(activeId === member.id ? null : member.id)}
              onMouseEnter={() => setHoveredId(member.id)}
              onMouseLeave={() => setHoveredId(null)}
              layout
            >
              <div className="aspect-[3/4] rounded-[1.5rem] overflow-hidden relative bg-ink-100 mb-5 shadow-inner">
                {/* Image with dynamic filters */}
                <img
                  src={`https://picsum.photos/seed/${member.image}/600/800`}
                  alt={member.name}
                  className={`w-full h-full object-cover transition-all duration-700 ease-[0.22,1,0.36,1] ${
                    isActive
                      ? 'grayscale-0 blur-0 scale-100 opacity-100 contrast-100 sepia-0'
                      : 'grayscale-[0.6] blur-[2px] scale-105 opacity-90 contrast-125 sepia-[0.2]'
                  }`}
                  referrerPolicy="no-referrer"
                />

                {/* Subtle grain overlay */}
                <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
                <div className="absolute inset-0 border border-black/5 rounded-[1.5rem] pointer-events-none"></div>

                {/* iMessage Bubble */}
                <div
                  className={`absolute bottom-4 left-4 right-8 bg-white/95 backdrop-blur-md text-ink-900 p-3.5 rounded-2xl rounded-bl-sm shadow-xl transition-all duration-500 ease-[0.22,1,0.36,1] transform origin-bottom-left ${
                    isActive
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                  }`}
                >
                  <p className="text-sm font-medium leading-snug">"{member.quote}"</p>
                </div>
              </div>

              <div className="px-2 pb-2">
                <h3
                  className={`font-serif text-2xl font-medium mb-1 transition-colors duration-300 ${isActive ? 'text-terracotta-600' : 'text-ink-900'}`}
                >
                  {member.name}
                </h3>
                <p className="text-ink-500 text-sm font-medium tracking-wide uppercase">
                  {member.role}
                </p>
              </div>
            </motion.div>
          );
        })}

        {/* Spacer to allow the last card to scroll fully into view with padding */}
        <div className="flex-shrink-0 w-6 md:w-[calc((100vw-80rem)/2)]" />
      </div>
    </div>
  );
}
