'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { ArrowLeft, MapPin, TrendingUp, Calendar, Award, Globe, FileText } from 'lucide-react';

export default function UniversityDetailPage() {
  const params = useParams();
  const universityId = params.universityId as string;
  const { trackedUnis } = useApp();

  const uni = trackedUnis.find((u: any) => String(u.id) === universityId);

  if (!uni) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: '800px' }}>
        <Link href="/universities" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', textDecoration: 'none', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back to Universities
        </Link>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <MapPin size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>University Not Found</h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>The university you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '900px' }}>
      <Link href="/universities" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', textDecoration: 'none', marginBottom: '20px' }}>
        <ArrowLeft size={16} /> Back to Universities
      </Link>

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              {(uni as any).name}
            </h2>
            {(uni as any).location && (
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} /> {(uni as any).location}
              </p>
            )}
          </div>
          <span style={{
            padding: '6px 14px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb',
            fontSize: '13px', fontWeight: 600,
          }}>
            {(uni as any).status}
          </span>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { icon: <TrendingUp size={18} />, label: 'Avg GPA', value: (uni as any).avg_gpa || 'N/A' },
            { icon: <Award size={18} />, label: 'Acceptance Rate', value: (uni as any).acceptance_rate || 'N/A' },
            { icon: <Calendar size={18} />, label: 'Deadline', value: (uni as any).deadlines || 'N/A' },
          ].map((stat, idx) => (
            <div key={idx} style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
              <div style={{ color: '#2563eb', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
              <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 2px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <Link
            href="/roadmap"
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff',
              fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
            }}
          >
            View Roadmap
          </Link>
          <Link
            href="/documents"
            style={{
              padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b',
              fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px',
            }}
          >
            <FileText size={16} /> Related Documents
          </Link>
        </div>

        {/* Requirements */}
        {(uni as any).reqs && (uni as any).reqs.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Requirements</h3>
            <ul style={{ padding: '0 0 0 20px' }}>
              {(uni as any).reqs.map((req: string, idx: number) => (
                <li key={idx} style={{ fontSize: '14px', color: '#64748b', marginBottom: '6px', lineHeight: 1.5 }}>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}