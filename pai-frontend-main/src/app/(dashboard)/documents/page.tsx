'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { FileText, Upload, Plus, X, Loader2, Download, Eye, Trash2 } from 'lucide-react';

export default function DocumentsPage() {
  const { documents, uploadDocument } = useApp();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('SOP');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!uploadName.trim() || !uploadFile) return;
    setUploading(true);
    await uploadDocument('My Portfolio', uploadName, uploadType, uploadFile);
    setUploading(false);
    setShowUpload(false);
    setUploadName('');
    setUploadType('SOP');
    setUploadFile(null);
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px' }}>
      <PageHeader
        title="Documents"
        subtitle="Manage your SOPs, LORs, Resumes, and other application files"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: '#2563eb', color: '#ffffff', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '8px',
          }}
        >
          <Upload size={16} /> Upload Document
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, backdropFilter: 'blur(2px)',
          }}
          onClick={() => setShowUpload(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            style={{
              background: '#ffffff', borderRadius: '16px', padding: '32px',
              maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Upload Document</h3>
              <X size={20} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => setShowUpload(false)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                placeholder="Document name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
              />
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="SOP">SOP</option>
                <option value="LOR">LOR</option>
                <option value="Resume">Resume</option>
                <option value="Transcript">Transcript</option>
                <option value="Other">Other</option>
              </select>
              <div style={{
                border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '24px',
                textAlign: 'center', cursor: 'pointer',
              }}>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                  id="doc-file-upload"
                />
                <label htmlFor="doc-file-upload" style={{ cursor: 'pointer', color: '#64748b', fontSize: '13px' }}>
                  {uploadFile ? uploadFile.name : 'Click to select file'}
                </label>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadName || !uploadFile}
                style={{
                  padding: '12px', borderRadius: '10px', border: 'none',
                  background: '#2563eb', color: '#ffffff', fontWeight: 600,
                  cursor: 'pointer', opacity: uploading ? 0.7 : 1,
                }}
              >
                {uploading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Upload'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Document Groups */}
      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <FileText size={48} style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 600 }}>No documents yet</p>
          <p style={{ fontSize: '14px' }}>Upload your first SOP, LOR, or Resume to get started.</p>
        </div>
      ) : (
        documents.map((group, gIdx) => (
          <motion.div
            key={gIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gIdx * 0.1 }}
            style={{
              background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9',
              padding: '24px', marginBottom: '16px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
              {group.university}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {group.documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: '10px', background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '8px',
                      background: '#eff6ff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#2563eb',
                    }}>
                      <FileText size={18} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>
                        {doc.name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                        {doc.type} • Edited {doc.lastEdited}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {doc.progress !== undefined && (
                      <div style={{ width: '80px' }}>
                        <div style={{
                          height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${doc.progress}%`,
                            background: '#2563eb', borderRadius: '3px',
                          }} />
                        </div>
                        <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'right', margin: '2px 0 0 0' }}>
                          {doc.progress}%
                        </p>
                      </div>
                    )}
                    <span style={{
                      padding: '4px 10px', borderRadius: '6px',
                      background: doc.status === 'optimized' ? '#ecfdf5' : doc.status === 'completed' ? '#eff6ff' : '#fef7ed',
                      color: doc.status === 'optimized' ? '#10b981' : doc.status === 'completed' ? '#2563eb' : '#f59e0b',
                      fontSize: '11px', fontWeight: 600,
                    }}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                    <Eye size={16} style={{ cursor: 'pointer', color: '#94a3b8' }} />
                    <Download size={16} style={{ cursor: 'pointer', color: '#94a3b8' }} />
                    <Trash2 size={16} style={{ cursor: 'pointer', color: '#ef4444' }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}