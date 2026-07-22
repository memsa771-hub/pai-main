'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import { ArrowLeft, FileText, Download, Eye } from 'lucide-react';

export default function DocumentDetailPage() {
  const params = useParams();
  const documentId = params.documentId as string;
  const { documents } = useApp();

  // Find the document across all groups
  let foundDoc: any = null;
  let foundGroup: any = null;
  for (const group of documents) {
    const doc = group.documents.find((d) => d.id === documentId);
    if (doc) {
      foundDoc = doc;
      foundGroup = group;
      break;
    }
  }

  if (!foundDoc) {
    return (
      <div style={{ padding: '24px 32px', maxWidth: '800px' }}>
        <Link href="/documents" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', textDecoration: 'none', marginBottom: '20px' }}>
          <ArrowLeft size={16} /> Back to Documents
        </Link>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Document Not Found</h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>The document you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '900px' }}>
      <Link href="/documents" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', textDecoration: 'none', marginBottom: '20px' }}>
        <ArrowLeft size={16} /> Back to Documents
      </Link>

      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={28} color="#2563eb" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>{foundDoc.name}</h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
              {foundDoc.type} • {foundGroup?.university} • Last edited {foundDoc.lastEdited}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={16} /> View Document
          </button>
          <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} /> Download
          </button>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '14px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
            Document preview will be displayed here.
          </p>
        </div>
      </div>
    </div>
  );
}