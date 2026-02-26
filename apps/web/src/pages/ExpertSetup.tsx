import React, { useState } from 'react';
import { ArrowLeft, UploadCloud, Link as LinkIcon, Plus, X, FileText, Sparkles } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

export function ExpertSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const expertName = location.state?.name || 'New Expert';

  const [tags, setTags] = useState(['AI Ethics', 'Enterprise Software']);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
    >
      <Link to="/app/experts" className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Experts
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-medium tracking-tight text-ink-900">Setup Profile: {expertName}</h1>
          <p className="text-ink-500 mt-2">Pre-fill information to help the AI understand their voice and expertise.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary" onClick={() => navigate('/app/experts')}>Skip for now</button>
          <button className="btn-primary" onClick={() => navigate('/app/experts/1')}>Save & Continue</button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Background & Expertise */}
        <section className="card space-y-4">
          <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">Background & Expertise</h2>
          <p className="text-sm text-ink-500">Provide a summary of their professional background, achievements, and unique perspective.</p>
          <textarea 
            className="w-full h-32 px-4 py-3 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-900 transition-shadow bg-beige-50 focus:bg-white resize-none"
            placeholder="e.g. A leading voice in enterprise technology architecture with over 15 years of experience scaling distributed systems..."
          ></textarea>
        </section>

        {/* Areas of Interest */}
        <section className="card space-y-4">
          <h2 className="text-xl font-serif font-medium border-b border-ink-100 pb-3">Areas of Interest</h2>
          <p className="text-sm text-ink-500">What topics do they frequently discuss or write about?</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center px-3 py-1.5 rounded-full bg-ink-100 text-ink-800 text-sm font-medium">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="ml-2 text-ink-400 hover:text-ink-900 focus:outline-none">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddTag} className="flex items-center space-x-3">
            <input 
              type="text" 
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-900 transition-shadow bg-beige-50 focus:bg-white"
              placeholder="Add a topic (e.g. Cloud Security)"
            />
            <button type="submit" className="btn-secondary px-6 py-3 whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" />
              Add Topic
            </button>
          </form>
        </section>

        {/* Training Sources */}
        <section className="card space-y-4">
          <div className="flex items-center justify-between border-b border-ink-100 pb-3">
            <h2 className="text-xl font-serif font-medium">Training Sources</h2>
            <span className="status-pill bg-info-100 text-info-700 flex items-center">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Voice Training
            </span>
          </div>
          <p className="text-sm text-ink-500">Upload past articles, speeches, or provide URLs to train the AI on their specific tone and vocabulary.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-ink-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-beige-50 hover:border-ink-300 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-ink-100 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-6 h-6 text-ink-500" />
              </div>
              <h3 className="text-sm font-medium text-ink-900 mb-1">Click to upload or drag and drop</h3>
              <p className="text-xs text-ink-500">PDF, DOCX, TXT (max. 10MB)</p>
            </div>

            {/* URL Input Area */}
            <div className="space-y-4 flex flex-col justify-center">
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
                <input 
                  type="url" 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-ink-900 transition-shadow bg-beige-50 focus:bg-white"
                  placeholder="Paste a link to an article or video"
                />
              </div>
              <button className="btn-secondary w-full">
                Add URL Source
              </button>
            </div>
          </div>

          {/* Uploaded Sources List */}
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Added Sources (2)</h3>
            <div className="p-3 bg-beige-50 rounded-xl text-sm font-medium text-ink-900 flex items-center justify-between group">
              <div className="flex items-center">
                <FileText className="w-4 h-4 mr-3 text-ink-400" />
                Keynote_Speech_2023.pdf
              </div>
              <button className="text-ink-400 hover:text-terracotta-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-beige-50 rounded-xl text-sm font-medium text-ink-900 flex items-center justify-between group">
              <div className="flex items-center">
                <LinkIcon className="w-4 h-4 mr-3 text-ink-400" />
                Medium Article: "The Hybrid Dilemma"
              </div>
              <button className="text-ink-400 hover:text-terracotta-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
