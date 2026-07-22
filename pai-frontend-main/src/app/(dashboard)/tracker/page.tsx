'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { TrendingUp, Plus, X, CheckCircle, Clock, AlertCircle, Trash2, Search } from 'lucide-react';

export default function TrackerPage() {
  const { trackedUnis, addTrackedUni, removeTrackedUni } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState('Interested');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    await addTrackedUni(newName, newStatus);
    setAdding(false);
    setShowAdd(false);
    setNewName('');
    setNewStatus('Interested');
  };

  const statusIcons: Record<string, React.ReactNode> = {
    'Interested': <AlertCircle size={14} color="#f59e0b" />,
    'Planning': <Clock size={14} color="#2563eb" />,
    'Applied': <CheckCircle size={14} color="#10b981" />,
    'Admitted': <CheckCircle size={14} color="#10b981" />,
    'Rejected': <X size={14} color="#ef4444" />,
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px' }}>
      <PageHeader title="University Tracker" subtitle="Track applications and monitor deadlines" />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: '#2563eb', color: '#ffffff', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
          }}
        >
          <Plus size={16} /> Add University
        </button>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, backdropFilter: 'blur(2px)',
          }}
          onClick={() => setShowAdd(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            style={{
              background: '#ffffff', borderRadius: '16px', padding: '32px',
              maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Track University</h3>
              <X size={20} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowAdd(false)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                placeholder="University name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
              />
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Interested">Interested</option>
                <option value="Planning">Planning</option>
                <option value="Applied">Applied</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={adding || !newName}
                style={{
                  padding: '12px', borderRadius: '10px', border: 'none',
                  background: '#2563eb', color: '#ffffff', fontWeight: 600,
                  cursor: 'pointer', opacity: adding ? 0.7 : 1,
                }}
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: trackedUnis.length, color: '#2563eb' },
          { label: 'Applied', value: trackedUnis.filter((u: any) => u.status === 'Applied').length, color: '#10b981' },
          { label: 'Interested', value: trackedUnis.filter((u: any) => u.status === 'Interested').length, color: '#f59e0b' },
        ].map((stat, idx) => (
          <div key={idx} style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #f1f5f9', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontSize: '28px', fontWeight: 800, color: stat.color, margin: '0 0 4px 0' }}>{stat.value}</p>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0, fontWeight: 500 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {trackedUnis.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <TrendingUp size={48} style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 600 }}>No universities tracked</p>
          <p style={{ fontSize: '14px' }}>Start tracking universities to monitor your applications.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '2fr 120px 120px 120px 80px',
            padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span>University</span>
            <span>Status</span>
            <span>Avg GPA</span>
            <span>Deadline</span>
            <span></span>
          </div>
          {trackedUnis.map((uni: any) => (
            <div
              key={uni.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 120px 120px 120px 80px',
                padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
                fontSize: '14px', alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{uni.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
                {statusIcons[uni.status]}
                {uni.status}
              </span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{uni.avg_gpa || 'N/A'}</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>{uni.deadlines || 'N/A'}</span>
              <Trash2
                size={16}
                style={{ cursor: 'pointer', color: '#ef4444', justifySelf: 'center' }}
                onClick={() => removeTrackedUni(uni.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}