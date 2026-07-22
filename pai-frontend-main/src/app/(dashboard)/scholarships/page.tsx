'use client';

import React from 'react';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { DollarSign, ExternalLink, Calendar, Award } from 'lucide-react';

const scholarships = [
  { name: 'Fulbright Scholarship', amount: '$40,000/year', deadline: 'Oct 15', country: 'USA', eligibility: 'International students, all fields' },
  { name: 'Chevening Scholarship', amount: 'Full tuition + stipend', deadline: 'Nov 5', country: 'UK', eligibility: 'Leadership potential, 2+ years work exp' },
  { name: 'DAAD Scholarship', amount: '€1,200/month', deadline: 'Oct 31', country: 'Germany', eligibility: 'Graduates, all disciplines' },
  { name: 'Erasmus Mundus', amount: '€24,000/year', deadline: 'Jan 15', country: 'Europe', eligibility: 'Master\'s students, consortium programs' },
];

export default function ScholarshipsPage() {
  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px' }}>
      <PageHeader title="Scholarships" subtitle="Discover funding opportunities for your education" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '16px' }}>
        {scholarships.map((s, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            style={{
              background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
                  {s.name}
                </h3>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DollarSign size={14} /> {s.amount}
                  </span>
                  <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> Deadline: {s.deadline}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px 0' }}>
                  <strong>Country:</strong> {s.country}
                </p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  {s.eligibility}
                </p>
              </div>
              <Award size={24} style={{ color: '#f59e0b' }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}