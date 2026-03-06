// PATH: apps/web/src/components/TeamCarousel.tsx
// WHAT: Horizontal landing carousel for the editorial team roles
// WHY:  Shows who does what in the newsroom with readable touch-friendly cards
// RELEVANT: apps/web/src/pages/Landing.tsx,apps/web/src/components/HeroInteractive.tsx,docs/user_stories.md

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import averyImage from '../public/images/team/avery.jpg';
import blairImage from '../public/images/team/blair.jpg';
import caseyImage from '../public/images/team/casey.jpg';
import jordanImage from '../public/images/team/jordan.jpg';
import morganImage from '../public/images/team/morgan.jpg';
import quinnImage from '../public/images/team/quinn.jpg';
import rowanImage from '../public/images/team/rowan.jpg';
import samImage from '../public/images/team/sam.jpg';
import taylorImage from '../public/images/team/taylor.jpg';

const teamImages = {
  avery: averyImage,
  blair: blairImage,
  casey: caseyImage,
  jordan: jordanImage,
  morgan: morganImage,
  quinn: quinnImage,
  rowan: rowanImage,
  sam: samImage,
  taylor: taylorImage,
} as const;

const teamMembers = [
  {
    id: 'morgan',
    name: 'Morgan',
    role: 'Editor-in-Chief',
    quote: 'I decide what goes to production.',
    image: teamImages.morgan,
  },
  {
    id: 'casey',
    name: 'Casey',
    role: 'The Interviewer',
    quote: "I capture the expert's voice in 2 minutes.",
    image: teamImages.casey,
  },
  {
    id: 'rowan',
    name: 'Rowan',
    role: 'Voice Stylist',
    quote: 'I make sure it sounds exactly like them.',
    image: teamImages.rowan,
  },
  {
    id: 'blair',
    name: 'Blair',
    role: 'Structure Editor',
    quote: 'I build the draft into a clear structure.',
    image: teamImages.blair,
  },
  {
    id: 'avery',
    name: 'Avery',
    role: 'Fact Checker',
    quote: 'I catch the factual holes.',
    image: teamImages.avery,
  },
  {
    id: 'jordan',
    name: 'Jordan',
    role: 'Compliance Officer',
    quote: 'I ensure every claim is safe and honest.',
    image: teamImages.jordan,
  },
  {
    id: 'sam',
    name: 'Sam',
    role: 'The Polisher',
    quote: 'I remove the corporate fluff.',
    image: teamImages.sam,
  },
  {
    id: 'quinn',
    name: 'Quinn',
    role: 'Revision Coordinator',
    quote: 'I merge all edits into one clean version.',
    image: teamImages.quinn,
  },
  {
    id: 'taylor',
    name: 'Taylor',
    role: 'Quality Gatekeeper',
    quote: 'I give the final green light.',
    image: teamImages.taylor,
  },
];

export function TeamCarousel() {
  const [activeId, setActiveId] = useState<string | null>(teamMembers[0]?.id ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const updateScrollState = React.useCallback(() => {
    const node = carouselRef.current;
    if (!node) return;

    const maxScrollLeft = node.scrollWidth - node.clientWidth;
    setCanScrollPrev(node.scrollLeft > 8);
    setCanScrollNext(node.scrollLeft < maxScrollLeft - 8);
  }, []);

  const scrollToMember = React.useCallback((memberId: string) => {
    const node = carouselRef.current;
    const card = cardRefs.current[memberId];
    if (!node || !card) return;

    const left = card.offsetLeft - 24;
    node.scrollTo({ left, behavior: 'smooth' });
    setActiveId(memberId);
  }, []);

  const scrollByDirection = React.useCallback(
    (direction: 'prev' | 'next') => {
      const currentIndex = teamMembers.findIndex((member) => member.id === activeId);
      const fallbackIndex = direction === 'next' ? 0 : teamMembers.length - 1;
      const baseIndex = currentIndex === -1 ? fallbackIndex : currentIndex;
      const nextIndex =
        direction === 'next'
          ? Math.min(baseIndex + 1, teamMembers.length - 1)
          : Math.max(baseIndex - 1, 0);

      scrollToMember(teamMembers[nextIndex].id);
    },
    [activeId, scrollToMember],
  );

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

  useEffect(() => {
    updateScrollState();
    const node = carouselRef.current;
    if (!node) return;

    node.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      node.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  return (
    <div className="w-full relative">
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

      <div className="max-w-7xl mx-auto px-6 mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-500 mb-2">
            Roles across the newsroom
          </p>
          <p className="text-sm md:text-base text-ink-500 max-w-2xl leading-relaxed">
            Swipe or scroll through the team. Tap any card to pin the role summary and read what
            that person owns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByDirection('prev')}
            disabled={!canScrollPrev}
            className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-white disabled:text-ink-300 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => scrollByDirection('next')}
            disabled={!canScrollNext}
            className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-white disabled:text-ink-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/*
        The padding-left calculation keeps the scroll rail aligned with the page container
        while still letting the final cards breathe near the right edge.
      */}
      <div
        className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-12 pt-4 px-6 md:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] md:pr-6 hide-scrollbar"
        ref={carouselRef}
      >
        {teamMembers.map((member) => {
          const isActive = activeId === member.id || hoveredId === member.id;

          return (
            <motion.div
              key={member.id}
              ref={(node) => {
                cardRefs.current[member.id] = node;
              }}
              className={`relative flex-shrink-0 w-[260px] md:w-[300px] snap-start group cursor-pointer rounded-[2rem] p-3 transition-colors duration-500 border ${isActive ? 'bg-beige-50 border-ink-200' : 'bg-transparent border-transparent hover:border-ink-100'}`}
              onClick={() => setActiveId(member.id)}
              onMouseEnter={() => setHoveredId(member.id)}
              onMouseLeave={() => setHoveredId(null)}
              layout
            >
              <div className="aspect-[3/4] rounded-[1.5rem] overflow-hidden relative bg-ink-100 mb-5 shadow-inner">
                {/* Image with dynamic filters */}
                <img
                  src={member.image}
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
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{member.quote}</p>
                <div className="mt-4 flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-ink-400">
                  <span>{isActive ? 'Role in focus' : 'Tap to focus'}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      scrollToMember(member.id);
                    }}
                    className="text-terracotta-600 hover:text-terracotta-700"
                  >
                    Reveal
                  </button>
                </div>
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
