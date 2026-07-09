'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { Plus, X, FileText, CheckCircle2, AlertCircle, Sparkles, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyDocumentsPage() {
  const { documents, recentActivity, uploadDocument, trackedUnis } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDocUni, setNewDocUni] = useState('Stanford University');
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('SOP');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setNewDocName(baseName);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !selectedFile) return;

    setIsUploading(true);
    try {
      await uploadDocument(newDocUni, newDocName, newDocType, selectedFile);
      setIsUploading(false);
      setIsModalOpen(false);
      setNewDocName('');
      setSelectedFile(null);
    } catch(err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  return (
    <>
      <PageHeader 
        title="My Documents"
        subtitle="Manage and track your application materials across all universities."
        actionButton={
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px' }} onClick={() => setIsModalOpen(true)}>
            <Plus size={14} /> Upload Document
          </button>
        }
      />
      
      <div className="page-content">

        <div className="docs-layout">
          {/* Left Column: University Document Sections */}
          <div>
            {documents.length === 0 ? (
              <div className="card flex-center" style={{ padding: '60px', flexDirection: 'column', gap: '16px' }}>
                <FileText size={48} className="text-muted" />
                <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No documents uploaded yet.</p>
              </div>
            ) : (
              documents.map((uniDocs, index) => (
                <div key={index} className="uni-section">
                  <div className="uni-section-header">
                    <div className="uni-title-area">
                      <div className="uni-icon">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h3 className="uni-name">{uniDocs.university}</h3>
                        <div className="uni-subtitle">
                          {uniDocs.degree} • {uniDocs.term}
                        </div>
                      </div>
                    </div>
                    <div className="uni-count">
                      {uniDocs.documents.length} {uniDocs.documents.length === 1 ? 'Document' : 'Documents'}
                    </div>
                  </div>

                  <div className="cards-grid">
                    {uniDocs.documents.map((doc) => (
                      <motion.div 
                        key={doc.id}
                        className="doc-card"
                        layoutId={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="doc-card-header">
                          <div>
                            <span className={`badge ${
                              doc.type === 'SOP' ? 'badge-primary' : 
                              doc.type === 'LOR' ? 'badge-success' : 'badge-gray'
                            }`} style={{ marginBottom: '12px' }}>
                              {doc.type}
                            </span>
                            <h4 className="doc-card-title">{doc.name}</h4>
                            <span className="doc-card-edited">
                              {doc.status === 'pending' ? 'Uploading...' : `Last edited ${doc.lastEdited}`}
                            </span>
                          </div>
                          <span className="doc-card-options">⋮</span>
                        </div>

                        {/* Card bottom states */}
                        {doc.status === 'optimized' && doc.progress !== undefined && (
                          <div className="doc-progress-container">
                            <div className="doc-progress-label">
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Sparkles size={12} /> AI OPTIMIZED
                              </span>
                              <span>{doc.progress}%</span>
                            </div>
                            <div className="doc-progress-bar">
                              <div className="doc-progress-fill" style={{ width: `${doc.progress}%` }} />
                            </div>
                          </div>
                        )}

                        {doc.status === 'completed' && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            background: 'var(--success-light)',
                            color: 'var(--success)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--success-border)',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            <CheckCircle2 size={14} /> VERIFIED & COMPLETED
                          </div>
                        )}

                        {doc.status === 'draft' && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 12px',
                            background: 'var(--background)',
                            color: 'var(--text-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            <FileText size={14} /> DRAFT IN PROGRESS
                          </div>
                        )}

                        {doc.status === 'pending' && (
                          <div className="doc-progress-container">
                            <div className="doc-progress-label animate-pulse-soft">
                              <span>AI OPTIMIZING...</span>
                            </div>
                            <div className="doc-progress-bar">
                              <motion.div 
                                className="doc-progress-fill" 
                                initial={{ width: '10%' }}
                                animate={{ width: '85%' }}
                                transition={{ duration: 4 }}
                              />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Column: Activity Panel */}
          <div className="activity-panel">
            <div className="activity-header">
              <Sparkles size={16} className="text-primary" />
              <span>RECENT ACTIVITY</span>
            </div>
            <div className="activity-list">
              {recentActivity.map((act) => (
                <div key={act.id} className="activity-item">
                  <span className="activity-text">{act.text}</span>
                  <span className="activity-time">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: 'auto', 
          paddingTop: '60px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '12px', 
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border-light)'
        }}>
          <div>© 2026 Placement AI. Sophisticated Guidance.</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }}>Terms of Service</span>
            <span style={{ cursor: 'pointer' }}>Contact Support</span>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Upload New Document</h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="uni-select">Target University</label>
                  <select 
                    id="uni-select"
                    className="form-input" 
                    value={newDocUni} 
                    onChange={(e) => setNewDocUni(e.target.value)}
                  >
                  {(trackedUnis.length > 0 ? trackedUnis.map(u => u.name) : ['Stanford University', 'MIT', 'London Business School', 'UCL']).map(uni => (
                    <option key={uni} value={uni}>{uni}</option>
                  ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="doc-type-select">Document Type</label>
                  <select 
                    id="doc-type-select"
                    className="form-input" 
                    value={newDocType} 
                    onChange={(e) => setNewDocType(e.target.value)}
                  >
                    <option value="SOP">SOP (Statement of Purpose)</option>
                    <option value="LOR">LOR (Letter of Recommendation)</option>
                    <option value="Resume">Resume / CV</option>
                    <option value="Transcript">Academic Transcript</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="doc-file-input">Select Document File</label>
                  <input 
                    type="file" 
                    id="doc-file-input"
                    className="form-input" 
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    required
                    disabled={isUploading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="doc-name-input">Document Name / File Name</label>
                  <input 
                    type="text" 
                    id="doc-name-input"
                    className="form-input" 
                    placeholder="e.g. Stanford_SOP_v2"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    required
                    disabled={isUploading}
                  />
                </div>

                {newDocType === 'SOP' && (
                  <div style={{ 
                    padding: '12px', 
                    background: 'var(--primary-light)', 
                    borderRadius: 'var(--radius-md)', 
                    color: 'var(--primary)', 
                    fontSize: '12px', 
                    fontWeight: 500,
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Sparkles size={14} /> Uploading an SOP triggers automatic AI optimization scanner.
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', borderRadius: 'var(--radius-full)' }}
                  disabled={isUploading || !newDocName}
                >
                  {isUploading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UploadCloud size={16} className="animate-pulse-soft" />
                      Uploading & Scanning...
                    </div>
                  ) : (
                    'Upload File'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
