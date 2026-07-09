'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { 
  Lock, CheckCircle2, Play, Circle, Plus, Compass, ChevronRight, X, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function MyRoadmapPage() {
  const { roadmaps, activeRoadmapUni, setActiveRoadmapUni, startRoadmapStep } = useApp();
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackDesc, setNewTrackDesc] = useState('');
  const [newTrackType, setNewTrackType] = useState('Alternative');

  const activeRoadmap = roadmaps[activeRoadmapUni] || roadmaps['Stanford University'];

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrackName) return;

    // Simulate adding track by displaying success alert
    setIsAddTrackOpen(false);
    setNewTrackName('');
    setNewTrackDesc('');
  };

  const getStepButton = (step: any, sectionIdx: number) => {
    if (step.status === 'locked') {
      return <Lock size={16} className="text-muted" />;
    }
    if (step.status === 'completed') {
      return <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />;
    }
    if (step.status === 'started') {
      return (
        <button 
          className="btn btn-secondary" 
          onClick={() => startRoadmapStep(activeRoadmap.university, sectionIdx, step.id)}
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          Complete
        </button>
      );
    }
    return (
      <button 
        className="btn btn-primary" 
        onClick={() => startRoadmapStep(activeRoadmap.university, sectionIdx, step.id)}
        style={{ padding: '6px 16px', fontSize: '12px' }}
      >
        Start
      </button>
    );
  };

  return (
    <>
      <PageHeader 
        title="Admission Roadmap" 
        subtitle="Your personalized application roadmap and timelines to top-tier universities." 
      />
      
      {/* University Tabs Header */}
      <div style={{ 
        background: 'var(--surface)', 
        borderBottom: '1px solid var(--border)', 
        display: 'flex', 
        gap: '24px', 
        padding: '0 40px' 
      }}>
        {Object.keys(roadmaps).map((uni) => (
          <button
            key={uni}
            onClick={() => setActiveRoadmapUni(uni)}
            style={{
              padding: '16px 0',
              fontWeight: 600,
              fontSize: '14px',
              fontFamily: 'var(--font-heading)',
              color: activeRoadmap.university === uni ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeRoadmap.university === uni ? 'var(--primary)' : 'transparent'}`,
              position: 'relative',
              transition: 'all 0.2s'
            }}
          >
            {uni}
          </button>
        ))}
      </div>

      <div className="page-content">
        {!activeRoadmap ? (
          <div className="card flex-center" style={{ padding: '60px', flexDirection: 'column', gap: '16px' }}>
            <Compass size={48} className="text-muted" />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No roadmap generated yet. Add a university to your tracker to generate your personalized roadmap.</p>
          </div>
        ) : (
          <>
          <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'var(--surface)',
          padding: '24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          marginBottom: '32px'
        }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
              {activeRoadmap.university} Roadmap
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              {activeRoadmap.degree} • {activeRoadmap.term}
            </p>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            background: 'var(--background)',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}>
            {/* Simple Circular Progress Badge */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: `conic-gradient(var(--primary) ${activeRoadmap.progress}%, var(--border) 0%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}>
                {activeRoadmap.progress}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>OVERALL PROGRESS</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                {activeRoadmap.progress === 0 ? 'Not Started' : activeRoadmap.progress === 100 ? 'Completed' : 'In Progress'}
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap Grid Layout */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '320px 1fr', 
          gap: '32px' 
        }}>
          
          {/* Left Column: Strategic Tracks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ height: 'fit-content' }}>
              <h3 style={{ 
                fontSize: '11px', 
                fontWeight: 800, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                marginBottom: '16px'
              }}>
                Strategic Tracks
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ 
                  padding: '16px', 
                  border: '2px solid var(--primary)', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--primary-light)' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>Bachelors in Business</h4>
                    <span className="badge badge-primary" style={{ fontSize: '9px' }}>Primary</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                    Focus on leadership and quantitative analysis for GSB undergraduate pathway.
                  </p>
                  <Link href="#" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Compass size={12} /> View Track Details
                  </Link>
                </div>

                <div style={{ 
                  padding: '16px', 
                  border: '1px solid var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  background: 'var(--surface)' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Economics Minor</h4>
                    <span className="badge badge-gray" style={{ fontSize: '9px' }}>Alternative</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Backup track focusing purely on macro/micro economics.
                  </p>
                </div>

                <button 
                  className="btn btn-outline" 
                  onClick={() => setIsAddTrackOpen(true)}
                  style={{ 
                    borderStyle: 'dashed', 
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    justifyContent: 'center',
                    fontSize: '13px'
                  }}
                >
                  <Plus size={14} /> Add New Track
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Steps Timeline */}
          <div className="card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative' }}>
              {/* Vertical line connecting steps */}
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '20px',
                bottom: '20px',
                width: '2px',
                background: 'var(--border)',
                zIndex: 1
              }} />

              {activeRoadmap.sections.map((section, sIdx) => {
                const isSectionLocked = section.steps.every(s => s.status === 'locked');
                
                return (
                  <div key={section.number} style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 2 }}>
                    
                    {/* Section Number Badge */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: isSectionLocked ? 'var(--border)' : 'var(--primary)',
                      color: isSectionLocked ? 'var(--text-muted)' : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      boxShadow: '0 0 0 4px var(--surface)'
                    }}>
                      {section.number}
                    </div>

                    <div style={{ flex: 1, paddingTop: '6px' }}>
                      <h3 style={{ 
                        fontSize: '14px', 
                        fontWeight: 800, 
                        letterSpacing: '0.05em', 
                        color: isSectionLocked ? 'var(--text-muted)' : 'var(--text-primary)',
                        marginBottom: '16px' 
                      }}>
                        {section.title}
                      </h3>

                      {/* Steps Cards list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {section.steps.map((step) => {
                          const isLocked = step.status === 'locked';
                          const isCompleted = step.status === 'completed';
                          const isStarted = step.status === 'started';

                          return (
                            <div 
                              key={step.id} 
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '16px 20px',
                                background: isLocked ? 'rgba(241, 245, 249, 0.4)' : 'var(--surface)',
                                border: `1px solid ${isStarted ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-md)',
                                opacity: isLocked ? 0.6 : 1,
                                gap: '20px',
                                boxShadow: isStarted ? '0 4px 12px rgba(0, 45, 156, 0.05)' : 'none'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  {step.type && (
                                    <span className="badge badge-primary" style={{ fontSize: '9px', padding: '2px 8px' }}>
                                      {step.type}
                                    </span>
                                  )}
                                  {step.priority && (
                                    <span className="badge badge-warning" style={{ fontSize: '9px', padding: '2px 8px' }}>
                                      {step.priority} Priority
                                    </span>
                                  )}
                                </div>
                                <h4 style={{ 
                                  fontSize: '15px', 
                                  fontWeight: 700, 
                                  color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                                  textDecoration: isCompleted ? 'line-through' : 'none'
                                }}>
                                  {step.title}
                                </h4>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  {step.description}
                                </p>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                {getStepButton(step, sIdx)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
          </>
        )}
      </div>

      {/* Add Track Modal */}
      <AnimatePresence>
        {isAddTrackOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add Strategic Track</h3>
                <button className="modal-close" onClick={() => setIsAddTrackOpen(false)} aria-label="Close modal">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddTrack}>
                <div className="form-group">
                  <label className="form-label" htmlFor="track-name-input">Track Name / Focus Area</label>
                  <input 
                    type="text" 
                    id="track-name-input"
                    className="form-input" 
                    placeholder="e.g. Finance & Economics" 
                    value={newTrackName} 
                    onChange={e => setNewTrackName(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="track-desc-input">Track Objective</label>
                  <textarea 
                    className="form-input" 
                    id="track-desc-input"
                    placeholder="Describe target areas, electives, or specific research paths..."
                    value={newTrackDesc} 
                    onChange={e => setNewTrackDesc(e.target.value)} 
                    style={{ minHeight: '80px' }} 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="track-type-select">Track Status</label>
                  <select 
                    id="track-type-select"
                    className="form-input"
                    value={newTrackType}
                    onChange={e => setNewTrackType(e.target.value)}
                  >
                    <option value="Primary">Primary (Active focus)</option>
                    <option value="Alternative">Alternative (Backup path)</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-full)' }}>
                  Add Strategic Track
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
