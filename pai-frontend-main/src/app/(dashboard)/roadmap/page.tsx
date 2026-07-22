'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Lock, ArrowRight, Compass } from 'lucide-react';

export default function RoadmapPage() {
  const { roadmaps, activeRoadmapUni, setActiveRoadmapUni, startRoadmapStep } = useApp();

  const roadmapKeys = Object.keys(roadmaps);

  const currentRoadmap = roadmaps[activeRoadmapUni];

  if (roadmapKeys.length === 0) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: '900px' }}>
        <PageHeader title="Roadmap" subtitle="Your step-by-step application guide" />
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
          <Compass size={56} style={{ marginBottom: '20px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
            No roadmap yet
          </h3>
          <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
            Start a conversation with PAI to generate your personalized admissions roadmap.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '800px' }}>
      <PageHeader title="Roadmap" subtitle="Your personalized application journey" />

      {/* University Selector */}
      {roadmapKeys.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {roadmapKeys.map((key) => (
            <button
              key={key}
              onClick={() => setActiveRoadmapUni(key)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                background: activeRoadmapUni === key ? '#2563eb' : '#ffffff',
                color: activeRoadmapUni === key ? '#ffffff' : '#64748b',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {currentRoadmap && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Overall Progress</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>{currentRoadmap.progress}%</span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${currentRoadmap.progress}%`,
              background: 'linear-gradient(90deg, #2563eb, #7c3aed)', borderRadius: '4px',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}

      {/* Sections */}
      {currentRoadmap?.sections.map((section, sIdx) => (
        <motion.div
          key={sIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sIdx * 0.1 }}
          style={{
            background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9',
            padding: '20px', marginBottom: '16px',
          }}
        >
          <h3 style={{
            fontSize: '15px', fontWeight: 700, color: '#0f172a',
            margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#eff6ff', color: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700,
            }}>
              {section.number}
            </span>
            {section.title}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {section.steps.map((step) => (
              <div
                key={step.id}
                onClick={() => {
                  if (step.status !== 'locked') {
                    startRoadmapStep(activeRoadmapUni, sIdx, step.id);
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '8px',
                  background: step.status === 'completed' ? '#ecfdf5' : step.status === 'started' ? '#eff6ff' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  cursor: step.status === 'locked' ? 'not-allowed' : 'pointer',
                  opacity: step.status === 'locked' ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {step.status === 'completed' ? (
                  <CheckCircle size={18} color="#10b981" />
                ) : step.status === 'started' ? (
                  <Circle size={18} color="#2563eb" fill="#2563eb" />
                ) : step.status === 'locked' ? (
                  <Lock size={18} color="#94a3b8" />
                ) : (
                  <Circle size={18} color="#cbd5e1" />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#334155', margin: 0 }}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                      {step.description}
                    </p>
                  )}
                </div>
                {step.priority && (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px',
                    background: step.priority === 'high' ? '#fef2f2' : step.priority === 'medium' ? '#fef7ed' : '#f1f5f9',
                    color: step.priority === 'high' ? '#ef4444' : step.priority === 'medium' ? '#f59e0b' : '#64748b',
                    fontSize: '10px', fontWeight: 600,
                  }}>
                    {step.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}