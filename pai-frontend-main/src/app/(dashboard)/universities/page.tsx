'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { Landmark, Plus, X, MapPin, TrendingUp, Calendar, Trash2, Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function UniversitiesPage() {
  const { trackedUnis, addTrackedUni, removeTrackedUni } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newUniName, setNewUniName] = useState('');
  const [newUniStatus, setNewUniStatus] = useState('Interested');
  const [adding, setAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAdd = async () => {
    if (!newUniName.trim()) return;
    setAdding(true);
    await addTrackedUni(newUniName, newUniStatus);
    setAdding(false);
    setShowAdd(false);
    setNewUniName('');
    setNewUniStatus('Interested');
  };

  const filtered = trackedUnis.filter((uni: any) =>
    uni.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    'Interested': '#fef7ed',
    'Planning': '#eff6ff',
    'Applied': '#ecfdf5',
    'Admitted': '#ecfdf5',
    'Rejected': '#fef2f2',
  };
  const statusTextColors: Record<string, string> = {
    'Interested': '#f59e0b',
    'Planning': '#2563eb',
    'Applied': '#10b981',
    'Admitted': '#10b981',
    'Rejected': '#ef4444',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px' }}>
      <PageHeader title="Universities" subtitle="Research and track your target universities" />

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
          <input
            placeholder="Search universities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 40px', borderRadius: '10px',
              border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
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
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add University</h3>
              <X size={20} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowAdd(false)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                placeholder="University name"
                value={newUniName}
                onChange={(e) => setNewUniName(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
              />
              <select
                value={newUniStatus}
                onChange={(e) => setNewUniStatus(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Interested">Interested</option>
                <option value="Planning">Planning</option>
                <option value="Applied">Applied</option>
              </select>
              <button
                onClick={handleAdd}
                disabled={adding || !newUniName}
                style={{
                  padding: '12px', borderRadius: '10px', border: 'none',
                  background: '#2563eb', color: '#ffffff', fontWeight: 600,
                  cursor: 'pointer', opacity: adding ? 0.7 : 1,
                }}
              >
                {adding ? 'Adding...' : 'Add University'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* University Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <Landmark size={48} style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 600 }}>No universities tracked yet</p>
          <p style={{ fontSize: '14px' }}>Add universities you're interested in to start tracking.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map((uni: any) => (
            <motion.div
              key={uni.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <Link
                    href={`/universities/${uni.id}`}
                    style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {uni.name} <ExternalLink size={14} style={{ color: '#94a3b8' }} />
                  </Link>
                  {uni.location && (
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} /> {uni.location}
                    </p>
                  )}
                </div>
                <Trash2
                  size={16}
                  style={{ cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}
                  onClick={() => removeTrackedUni(uni.id)}
                />
              </div>

              <span style={{
                display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
                background: statusColors[uni.status] || '#f1f5f9',
                color: statusTextColors[uni.status] || '#64748b',
                fontSize: '11px', fontWeight: 600, marginBottom: '12px',
              }}>
                {uni.status}
              </span>

              {(uni.avg_gpa || uni.acceptance_rate || uni.deadlines) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  {uni.avg_gpa && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>Avg GPA</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '2px 0 0 0' }}>{uni.avg_gpa}</p>
                    </div>
                  )}
                  {uni.acceptance_rate && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>Acceptance</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '2px 0 0 0' }}>{uni.acceptance_rate}</p>
                    </div>
                  )}
                  {uni.deadlines && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0 }}>Deadline</p>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', margin: '2px 0 0 0' }}>{uni.deadlines}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}