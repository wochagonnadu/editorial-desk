import React, { useState } from 'react';
import { Clock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Approvals() {
  const [mode, setMode] = useState<'stuck' | 'reviewer'>('stuck');

  const stuckItems = [
    { id: 1, title: 'Sustainable Supply Chains', reviewer: 'Sarah Jenkins', waitTime: '2 days', status: 'Needs Review', urgent: true },
    { id: 2, title: 'AI in Healthcare Ethics', reviewer: 'Dr. Robert Smith', waitTime: '1 day', status: 'Revisions', urgent: true },
    { id: 3, title: 'Q3 Market Analysis', reviewer: 'Factcheck Team', waitTime: '5 hours', status: 'Factcheck', urgent: false },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif">Approvals</h1>
          <p className="text-ink-500 mt-1">Resolve bottlenecks and keep content moving.</p>
        </div>
        <button className="btn-primary">
          Resolve bottlenecks
        </button>
      </header>

      <div className="flex items-center space-x-4 border-b border-ink-100 pb-4">
        <button 
          onClick={() => setMode('stuck')}
          className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${mode === 'stuck' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-beige-100'}`}
        >
          Stuck items
        </button>
        <button 
          onClick={() => setMode('reviewer')}
          className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${mode === 'reviewer' ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-beige-100'}`}
        >
          By reviewer
        </button>
      </div>

      <div className="space-y-4">
        {stuckItems.map((item) => (
          <div key={item.id} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className={`mt-1 p-2 rounded-full ${item.urgent ? 'bg-terracotta-500/10 text-terracotta-600' : 'bg-warning-100 text-warning-700'}`}>
                {item.urgent ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <Link to={`/app/drafts/${item.id}`} className="text-lg font-medium text-ink-900 hover:text-terracotta-600 transition-colors">
                  {item.title}
                </Link>
                <div className="flex items-center text-sm text-ink-500 mt-1 space-x-3">
                  <span>Waiting on: <span className="font-medium text-ink-900">{item.reviewer}</span></span>
                  <span>•</span>
                  <span className={item.urgent ? 'text-terracotta-600 font-medium' : ''}>Waiting {item.waitTime}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 sm:ml-auto">
              <span className={`status-pill ${
                item.status === 'Needs Review' ? 'status-review' :
                item.status === 'Revisions' ? 'status-revisions' :
                'status-factcheck'
              }`}>
                {item.status}
              </span>
              <button className="btn-secondary py-2 px-4 text-sm whitespace-nowrap">
                <Mail className="w-4 h-4 mr-2" />
                Gentle reminder
              </button>
              <button className="p-2 text-ink-400 hover:text-ink-900 hover:bg-beige-50 rounded-xl transition-colors">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
