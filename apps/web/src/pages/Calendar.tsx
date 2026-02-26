import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { motion } from 'motion/react';

export function Calendar() {
  const [view, setView] = useState<'week' | 'month'>('week');

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Mock data for week view
  const weekData = [
    { day: 'Mon', date: '23', items: [] },
    { day: 'Tue', date: '24', items: [
      { title: 'Future of Remote Work', expert: 'Dr. Emily Chen', status: 'Needs Review' }
    ]},
    { day: 'Wed', date: '25', items: [
      { title: 'Q3 Market Analysis', expert: 'Marcus Johnson', status: 'Factcheck' },
      { title: 'Weekly Topics', expert: 'Editorial Team', status: 'Drafting' }
    ]},
    { day: 'Thu', date: '26', items: [] },
    { day: 'Fri', date: '27', items: [
      { title: 'AI in Healthcare', expert: 'Dr. Robert Smith', status: 'Approved' }
    ]},
    { day: 'Sat', date: '28', items: [] },
    { day: 'Sun', date: '29', items: [] },
  ];

  return (
    <div className="space-y-8 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Editorial Calendar</h1>
          <p className="text-ink-500 mt-1">October 2023</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-beige-50 border border-ink-100 rounded-xl p-1 flex relative">
            {(['week', 'month'] as const).map((v) => (
              <button 
                key={v}
                onClick={() => setView(v)}
                className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors z-10 ${view === v ? 'text-white' : 'text-ink-500 hover:text-ink-900'}`}
              >
                {view === v && (
                  <motion.div
                    layoutId="calendarToggle"
                    className="absolute inset-0 bg-ink-900 rounded-lg -z-10"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-primary">
            Create draft
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between bg-white border border-ink-100 rounded-xl p-2 px-4">
        <div className="flex items-center space-x-4">
          <button className="p-1 hover:bg-beige-50 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-ink-500" /></button>
          <span className="font-medium text-ink-900">Oct 23 - Oct 29</span>
          <button className="p-1 hover:bg-beige-50 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-ink-500" /></button>
        </div>
        <button className="btn-secondary py-1.5 px-3 text-sm">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </button>
      </div>

      {view === 'week' ? (
        <div className="flex-1 grid grid-cols-7 gap-4 min-h-[500px]">
          {weekData.map((col, i) => (
            <div key={i} className="flex flex-col">
              <div className="text-center mb-4">
                <div className="text-sm font-medium text-ink-500 uppercase tracking-wider">{col.day}</div>
                <div className={`text-2xl font-serif mt-1 ${col.date === '25' ? 'text-terracotta-600' : 'text-ink-900'}`}>{col.date}</div>
              </div>
              <div className="flex-1 bg-white border border-ink-100 rounded-2xl p-2 space-y-2">
                {col.items.map((item, j) => (
                  <div key={j} className="p-3 bg-beige-50 rounded-xl border border-ink-100 hover:border-ink-300 cursor-pointer transition-colors group">
                    <span className={`status-pill mb-2 ${
                      item.status === 'Needs Review' ? 'status-review' :
                      item.status === 'Drafting' ? 'status-drafting' :
                      item.status === 'Approved' ? 'status-approved' :
                      'status-factcheck'
                    }`}>
                      {item.status}
                    </span>
                    <h3 className="font-medium text-sm text-ink-900 group-hover:text-terracotta-600 transition-colors leading-tight">{item.title}</h3>
                    <p className="text-xs text-ink-500 mt-2">{item.expert}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 bg-white border border-ink-100 rounded-2xl overflow-hidden flex flex-col min-h-[600px]">
          <div className="grid grid-cols-7 border-b border-ink-100 bg-beige-50">
            {days.map(day => (
              <div key={day} className="py-3 text-center text-sm font-medium text-ink-500 uppercase tracking-wider border-r border-ink-100 last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-5">
            {Array.from({ length: 35 }).map((_, i) => {
              const date = i - 1; // offset for month start
              const isCurrentMonth = date > 0 && date <= 31;
              const hasItem = date === 15 || date === 24 || date === 25;
              
              return (
                <div key={i} className={`border-r border-b border-ink-100 last:border-r-0 p-2 min-h-[100px] ${!isCurrentMonth ? 'bg-beige-50/50' : ''}`}>
                  {isCurrentMonth && (
                    <>
                      <div className={`text-sm font-medium mb-1 ${date === 25 ? 'text-terracotta-600' : 'text-ink-500'}`}>{date}</div>
                      {hasItem && (
                        <div className="text-xs p-1.5 bg-warning-100 text-warning-700 rounded-md truncate cursor-pointer hover:bg-warning-200">
                          Review: Q3 Analysis
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
