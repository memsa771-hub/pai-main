'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { Plus, MapPin, GraduationCap, Compass, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import './uni-tracker.css';


export default function UniTrackerPage() {
  const { trackedUnis, addTrackedUni, removeTrackedUni } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddUniOpen, setIsAddUniOpen] = useState(false);
  const [newUniName, setNewUniName] = useState('');
  const [newUniStatus, setNewUniStatus] = useState('Interested');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddUni = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUniName) return;

    setIsAdding(true);
    await addTrackedUni(newUniName, newUniStatus);
    setIsAdding(false);
    setIsAddUniOpen(false);
    setNewUniName('');
  };

  // Map tracked unis to display format
  const unis = trackedUnis.map(u => ({
    id: u.id,
    name: u.name,
    location: u.location || 'Global Campus',
    avgGpa: u.avg_gpa || 'N/A',
    avgGre: u.avg_gre || 'N/A',
    deadlines: u.deadlines || 'Rolling',
    status: u.status,
    acceptanceRate: u.acceptance_rate || 'N/A',
    reqs: u.reqs || []
  }));

  const filteredUnis = searchQuery.trim() 
    ? unis.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : unis;

  return (
    <>
      <PageHeader 
        title="University Tracker"
        subtitle="Search, compare, and track admissions requirements and statistics."
        showSearch={true}
        searchPlaceholder="Search universities..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        actionButton={
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px' }} onClick={() => setIsAddUniOpen(true)}>
            <Plus size={14} /> Add University
          </button>
        }
      />
      <div className="page-content">

        {/* University Comparison Table */}
        {filteredUnis.length === 0 ? (
          <div className="card flex-center" style={{ padding: '60px', flexDirection: 'column', gap: '16px' }}>
            <GraduationCap size={48} className="text-muted" />
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No universities match your search criteria.</p>
          </div>
        ) : (
          <div className="tracker-table-container">
            <table className="tracker-table">
              <thead>
                <tr>
                  <th>University Target</th>
                  <th>Status</th>
                  <th>Avg GPA</th>
                  <th>Avg Score</th>
                  <th>Accept. Rate</th>
                  <th>Deadline</th>
                  <th>Required Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnis.map((uni, idx) => (
                  <tr key={uni.name}>
                    {/* University Cell */}
                    <td>
                      <div className="uni-cell-wrap">
                        <div className="uni-cell-logo">
                          {uni.name.charAt(0)}
                        </div>
                        <div>
                          <div className="uni-cell-name">{uni.name}</div>
                          <div className="uni-cell-loc">
                            <MapPin size={10} /> {uni.location}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Cell */}
                    <td>
                      <span className={`badge ${
                        uni.status === 'In Progress' ? 'badge-primary' :
                        uni.status === 'SOP Drafting' ? 'badge-primary' : 'badge-gray'
                      }`} style={{ fontSize: '10px' }}>
                        {uni.status}
                      </span>
                    </td>

                    {/* Avg GPA */}
                    <td style={{ fontWeight: 600 }}>{uni.avgGpa.split(' ')[0]}</td>

                    {/* Avg Score */}
                    <td style={{ fontWeight: 600 }}>{uni.avgGre.split(' ')[0]}</td>

                    {/* Acceptance Rate */}
                    <td style={{ fontWeight: 600 }}>{uni.acceptanceRate}</td>

                    {/* Deadline */}
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {uni.deadlines.split(' (')[0]}
                    </td>

                    {/* Documents Required */}
                    <td>
                      <div className="table-reqs-wrap">
                        {uni.reqs.map((req, rIdx) => (
                          <span key={rIdx} className="table-reqs-badge">
                            {req}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="table-actions-cell">
                        <Link href="/dashboard/roadmap" className="table-action-link">
                          <Compass size={14} /> Roadmap
                        </Link>
                        <button 
                          className="table-remove-btn"
                          onClick={() => removeTrackedUni(uni.id)}
                          aria-label={`Remove ${uni.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add University Modal */}
      <AnimatePresence>
        {isAddUniOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add University Target</h3>
                <button className="modal-close" onClick={() => setIsAddUniOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddUni}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-uni-name-table">University Name</label>
                  <input 
                    type="text" 
                    id="new-uni-name-table"
                    className="form-input" 
                    placeholder="e.g. Oxford University" 
                    value={newUniName} 
                    onChange={e => setNewUniName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="new-uni-status-table">Application Status</label>
                  <select 
                    id="new-uni-status-table"
                    className="form-input" 
                    value={newUniStatus} 
                    onChange={e => setNewUniStatus(e.target.value)}
                  >
                    <option value="Interested">Interested</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="SOP Drafting">SOP Drafting</option>
                    <option value="Completed">Completed / Submitted</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', borderRadius: 'var(--radius-full)' }}
                  disabled={isAdding || !newUniName}
                >
                  {isAdding ? 'Researching University...' : 'Add Target Track'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
