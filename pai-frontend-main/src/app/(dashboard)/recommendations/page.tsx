'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Landmark, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RecommendationsPage() {
  const { profile, trackedUnis } = useApp();

  const recommendations = [
    {
      title: 'MIT - Computer Science',
      reason: 'Based on your profile and STEM background',
      match: 98,
    },
    {
      title: 'Stanford University - MS CS',
      reason: 'Aligns with your research experience',
      match: 95,
    },
    {
      title: 'UC Berkeley - Data Science',
      reason: 'Strong match with your skills',
      match: 92,
    },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '900px' }}>
      <PageHeader title="Recommendations" subtitle="AI-powered university suggestions based on your profile" />

      {recommendations.map((rec, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          style={{
            background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9',
            padding: '24px', marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                {rec.title}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0' }}>{rec.reason}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '120px', height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${rec.match}%`, background: '#2563eb', borderRadius: '3px' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>{rec.match}% match</span>
              </div>
            </div>
            <Link
              href="/universities"
              style={{
                padding: '8px 16px', borderRadius: '8px', background: '#eff6ff',
                color: '#2563eb', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              View <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}