'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { 
  Plus, Calendar, Check, Circle, Loader2, Sparkles, TrendingUp, AlertTriangle, 
  ChevronLeft, ChevronRight, FileText, Landmark, Clock, ArrowRight, HelpCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ApplicationsPage() {
  const { documents, trackedUnis, roadmaps } = useApp();
  const [activeTab, setActiveTab] = useState('');
  const [timelineMonthOffset, setTimelineMonthOffset] = useState(0);

  const tabs = trackedUnis.length > 0 
    ? trackedUnis.map(u => u.name) 
    : ['Stanford University', 'MIT', 'London Business School', 'UCL'];
  
  const effectiveTab = activeTab || tabs[0] || '';

  // Interactive checklist states keyed by university
  const [uniChecklists, setUniChecklists] = useState<Record<string, Array<{ name: string; status: string; label: string }>>>({});

  const uniInsights: Record<string, { probability: number; matchRate: number; extraChance: number; benchmark: string; quality: string }> = {};

  const uniScholarships: Record<string, { name: string; desc: string }> = {};

  const uniDeadlines: Record<string, Array<{ type: string; name: string; month: string; day: string }>> = {};

  const getInsightForUni = (uni: string) => {
    if (uniInsights[uni]) return uniInsights[uni];
    const hash = uni.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const probability = 65 + (hash % 25);
    const matchRate = 75 + (hash % 20);
    const extraChance = 3 + (hash % 5);
    const benchmark = `Top ${(10 + (hash % 10))}%`;
    const quality = hash % 2 === 0 ? 'Gold Standard' : 'Excellent';
    return { probability, matchRate, extraChance, benchmark, quality };
  };

  const getDeadlinesForUni = (uni: string, trackedUni?: any) => {
    if (uniDeadlines[uni]) return uniDeadlines[uni];
    if (trackedUni?.deadlines && trackedUni.deadlines !== 'Rolling' && trackedUni.deadlines !== 'N/A') {
      const dlStr = trackedUni.deadlines;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let month = 'Dec';
      let day = '15';
      for (const m of months) {
        if (dlStr.toLowerCase().includes(m.toLowerCase())) {
          month = m;
          const match = dlStr.match(/\d+/);
          if (match) day = match[0];
          break;
        }
      }
      return [
        { type: 'Standard Application', name: `${uni} Deadline`, month, day },
        { type: 'Scholarship Deadline', name: 'Financial Aid Support', month: months[(months.indexOf(month) + 1) % 12], day: '05' }
      ];
    }
    return [
      { type: 'Standard Application', name: `${uni} Regular Deadline`, month: 'Jan', day: '15' },
      { type: 'Scholarship Deadline', name: 'Global Merit Funding', month: 'Feb', day: '01' }
    ];
  };

  const handleDocAction = (index: number) => {
    setUniChecklists(prev => {
      const current = prev[effectiveTab] ? [...prev[effectiveTab]] : [
        { name: 'Academic Transcripts', status: 'pending', label: 'REQUEST' },
        { name: 'Statement of Purpose', status: 'pending', label: 'REQUEST' },
        { name: 'Letter of Recommendation', status: 'pending', label: 'REQUEST' }
      ];
      
      const updated = [...current];
      if (updated[index].status === 'pending') {
        updated[index].status = 'requesting';
        updated[index].label = 'REQUESTING...';
        
        setTimeout(() => {
          setUniChecklists(latest => {
            const list = latest[effectiveTab] ? [...latest[effectiveTab]] : [];
            if (list[index]) {
              list[index] = {
                ...list[index],
                status: 'requested',
                label: 'REQUESTED'
              };
            }
            return {
              ...latest,
              [effectiveTab]: list
            };
          });
        }, 2000);
      }
      return {
        ...prev,
        [effectiveTab]: updated
      };
    });
  };

  const trackedUni = trackedUnis.find(u => u.name === effectiveTab);
  const roadmap = roadmaps[effectiveTab];

  const currentChecklist = uniChecklists[effectiveTab] || [
    { name: 'Academic Transcripts', status: 'pending', label: 'REQUEST' },
    { name: 'Statement of Purpose', status: 'pending', label: 'REQUEST' },
    { name: 'Letter of Recommendation', status: 'pending', label: 'REQUEST' }
  ];

  const currentInsight = getInsightForUni(effectiveTab);
  const currentDeadlines = getDeadlinesForUni(effectiveTab, trackedUni);

  const scholarships = trackedUni?.reqs ? (typeof trackedUni.reqs === 'string' ? JSON.parse(trackedUni.reqs) : trackedUni.reqs) : [];
  const scholarshipName = scholarships.length > 0 ? scholarships[0] : (uniScholarships[effectiveTab]?.name || 'Global Merit Scholarship');
  const scholarshipDesc = scholarships.length > 0 
    ? `You are eligible to apply for the ${scholarships[0]} at ${effectiveTab}.`
    : (uniScholarships[effectiveTab]?.desc || `Based on your academic profile, you qualify for institutional funding options.`);

  return (
    <>
      <PageHeader 
        title="University Applications"
        subtitle="Manage your active global applications and track your journey to enrollment."
        showSearch={true} 
        searchPlaceholder="Search applications..."
        actionButton={
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '11px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} /> Timeline
            </button>
            <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11px', height: '28px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={12} /> New App
            </button>
          </div>
        }
      />

      <div className="page-content">

        {/* Stats Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '24px', 
          marginBottom: '32px' 
        }}>
          {/* Stat 1 */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Active Apps
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1 }}>04</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Across 2 countries</div>
            </div>
            <div style={{ color: 'var(--primary)', opacity: 0.8 }}>
              <TrendingUp size={32} />
            </div>
          </div>

          {/* Stat 2 */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                Tasks Due
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1, color: 'var(--danger)' }}>12</div>
                <span className="badge badge-warning" style={{ fontSize: '9px', verticalAlign: 'middle' }}>3 Critical</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>3 critical documents</div>
            </div>
            <div style={{ color: 'var(--danger)', opacity: 0.8 }}>
              <AlertTriangle size={32} />
            </div>
          </div>

          {/* Stat 3 */}
          <div className="card">
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Overall Completion
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>68% <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Total</span></div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>24/36 Tasks</div>
            </div>
            <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--primary)', width: '68%', borderRadius: '3px' }} />
            </div>
          </div>
        </div>

        {/* University Selection Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '24px', 
          borderBottom: '1px solid var(--border)', 
          marginBottom: '28px' 
        }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 0',
                fontWeight: 600,
                fontSize: '14px',
                fontFamily: 'var(--font-heading)',
                color: effectiveTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                borderBottom: `2px solid ${effectiveTab === tab ? 'var(--primary)' : 'transparent'}`,
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Pathway Progress Flowchart */}
        <div className="card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="uni-icon" style={{ background: 'var(--border-light)', color: 'var(--text-primary)', width: '38px', height: '38px' }}>
                {effectiveTab.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{effectiveTab} Pathway</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{roadmap?.degree || 'Graduate Program'}</span>
              </div>
            </div>
            <span className="badge badge-primary">{trackedUni?.status || 'In Progress'}</span>
          </div>

          {/* Flowchart Progress Visuals */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            position: 'relative',
            padding: '10px 40px'
          }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute',
              left: '80px',
              right: '80px',
              height: '3px',
              background: 'var(--border)',
              zIndex: 1
            }} />
            <div style={{
              position: 'absolute',
              left: '80px',
              width: '45%',
              height: '3px',
              background: 'var(--primary)',
              zIndex: 2
            }} />

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 3, position: 'relative' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--success)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 4px var(--surface)'
              }}>
                <Check size={16} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>PREPARATION</div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>{trackedUni?.avg_gre ? `Target GRE: ${trackedUni.avg_gre}` : 'Verified'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 3, position: 'relative' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 4px var(--surface)'
              }}>
                <FileText size={16} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>APPLICATION</div>
              <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>{roadmap?.sections[1]?.title || 'Drafting SOP'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 3, position: 'relative' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--surface)',
                border: '3px solid var(--border)',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 0 4px var(--surface)'
              }}>
                <Landmark size={14} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>FINANCIALS</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{scholarships.length > 0 ? 'Scholarship Found' : 'Pending'}</div>
            </div>
          </div>
        </div>

        {/* Split grid: Checklists vs Insights & Deadlines */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 340px', 
          gap: '32px',
          marginBottom: '32px'
        }}>
          {/* Left Column: Required Documents & Financial Aid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Required Documents */}
            <div className="card">
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>
                Required Documents
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {currentChecklist.map((doc, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: idx !== currentChecklist.length - 1 ? '1px solid var(--border-light)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {doc.status === 'verified' || doc.status === 'completed' ? (
                        <Check size={18} style={{ color: 'var(--success)' }} />
                      ) : doc.status === 'drafting' ? (
                        <Circle size={18} style={{ color: 'var(--primary)', fill: 'rgba(0, 45, 156, 0.15)' }} />
                      ) : doc.status === 'requested' ? (
                        <Check size={18} style={{ color: 'var(--success)' }} />
                      ) : (
                        <Circle size={18} className="text-muted" />
                      )}
                      <span style={{ 
                        fontWeight: 600, 
                        fontSize: '14px',
                        color: 'var(--text-primary)' 
                      }}>
                        {doc.name}
                      </span>
                    </div>

                    <div>
                      {(doc.status === 'verified' || doc.status === 'completed') && (
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '11px' }}>
                          VIEW
                        </button>
                      )}
                      {doc.status === 'drafting' && (
                        <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                          DRAFTING
                        </span>
                      )}
                      {doc.status === 'pending' && (
                        <button 
                          className="btn btn-outline" 
                          onClick={() => handleDocAction(idx)}
                          style={{ padding: '6px 12px', fontSize: '11px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                        >
                          REQUEST
                        </button>
                      )}
                      {doc.status === 'requesting' && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Loader2 size={12} className="animate-spin" /> REQUESTING...
                        </span>
                      )}
                      {doc.status === 'requested' && (
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>
                          SENT
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Aid Status */}
            <div className="card">
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                Financial Aid Status
              </h3>

              <div style={{ 
                display: 'flex', 
                gap: '16px',
                padding: '16px',
                background: 'var(--success-light)',
                color: 'var(--success)',
                border: '1px solid var(--success-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <Landmark size={24} style={{ marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>{scholarshipName}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                    {scholarshipDesc}
                  </p>
                  <Link href="#" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Begin Application <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Insight & Deadlines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Placement AI Insight */}
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #021B59, #002d9c)', 
              color: 'white',
              border: 'none'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PLACEMENT AI INSIGHT
              </span>

              <div style={{ margin: '24px 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1 }}>{currentInsight.probability}</span>
                  <span style={{ fontSize: '24px', fontWeight: 700 }}>%</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '8px', opacity: 0.9 }}>
                  Admission Probability
                </div>
              </div>

              <p style={{ fontSize: '13px', opacity: 0.9, lineHeight: 1.5, marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '20px' }}>
                Your profile matches **{currentInsight.matchRate}%** of recently admitted candidates. Refine your SOP to gain **+{currentInsight.extraChance}%** chance.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.8 }}>Peer Benchmarking</span>
                  <span style={{ fontWeight: 700 }}>{currentInsight.benchmark}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.8 }}>Document Quality</span>
                  <span style={{ fontWeight: 700 }}>{currentInsight.quality}</span>
                </div>
              </div>
            </div>

            {/* Deadlines */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Deadlines
                </h3>
                <span className="badge badge-danger" style={{ fontSize: '9px', padding: '2px 8px' }}>
                  Action Required
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                {currentDeadlines.map((dl, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ 
                      background: 'var(--background)', 
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      width: '42px',
                      height: '44px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{dl.month}</span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{dl.day}</span>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700 }}>{dl.type}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{dl.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn-outline" style={{ width: '100%', padding: '10px', fontSize: '12px', justifyContent: 'center' }}>
                Full Calendar View
              </button>
            </div>

          </div>
        </div>

        {/* Master Application Timeline */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800 }}>Master Application Timeline</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sync across all your active university applications.</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className="header-icon-btn" 
                onClick={() => setTimelineMonthOffset(prev => prev - 1)}
                style={{ width: '32px', height: '32px' }}
                aria-label="Previous months"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                className="header-icon-btn" 
                onClick={() => setTimelineMonthOffset(prev => prev + 1)}
                style={{ width: '32px', height: '32px' }}
                aria-label="Next months"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Gantt Timeline visualizer */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Timeline Header Months */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--border)', paddingBottom: '8px', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div style={{ paddingLeft: '10px' }}>October</div>
                <div style={{ paddingLeft: '10px' }}>November</div>
                <div style={{ paddingLeft: '10px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  December (Current) <Clock size={12} />
                </div>
                <div style={{ paddingLeft: '10px' }}>January</div>
              </div>

              {/* Gantt row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', height: '80px', alignItems: 'center', position: 'relative' }}>
                
                {/* Block 1: University GRE (Oct) */}
                <div style={{ padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--primary)',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    {effectiveTab} GRE
                    <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Completed Oct 24</div>
                  </div>
                </div>

                {/* Block 2: SOP Drafting (Nov) */}
                <div style={{ padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--primary)',
                    fontSize: '12px',
                    fontWeight: 700
                  }}>
                    SOP Drafting
                    <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>Completed Nov 28</div>
                  </div>
                </div>

                {/* Block 3: Final Submission & Target Deadline (Dec) */}
                <div style={{ padding: '0 10px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                  <div style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--primary)',
                    color: 'white',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    Final Submission (Due {currentDeadlines[0]?.month || 'Dec'} {currentDeadlines[0]?.day || '15'})
                  </div>
                  <div style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {effectiveTab} Deadline
                  </div>
                </div>

                {/* Block 4: Interview Phase (Jan) */}
                <div style={{ padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '2px dashed var(--border)',
                    color: 'var(--text-muted)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    Interview Phase
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
