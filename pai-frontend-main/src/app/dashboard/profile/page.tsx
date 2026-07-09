'use client';

import React, { useState, useEffect } from 'react';
import { useApp, WorkExperience, Education, ProjectItem } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { 
  Plus, Edit2, CheckCircle2, Download, Trash2, X, GraduationCap, Briefcase, FileText, Target, PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './profile.css';

export default function MyProfilePage() {
  const { 
    profile, 
    addSkill, 
    removeSkill, 
    updateProfile,
    addEducation,
    deleteEducation,
    addExperience,
    deleteExperience,
    addProject,
    deleteProject
  } = useApp();
  
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryInput, setSummaryInput] = useState(profile.summary);
  const [newSkill, setNewSkill] = useState('');
  
  // Exporter Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('ats');
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  // Modals for adding items
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);

  // New item form inputs
  const [workRole, setWorkRole] = useState('');
  const [workCompany, setWorkCompany] = useState('');
  const [workPeriod, setWorkPeriod] = useState('');
  const [workDesc, setWorkDesc] = useState('');

  const [eduDegree, setEduDegree] = useState('');
  const [eduSchool, setEduSchool] = useState('');
  const [eduPeriod, setEduPeriod] = useState('');
  const [eduGpa, setEduGpa] = useState('');
  const [eduDetails, setEduDetails] = useState('');

  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');

  // Sync state with profile summary on load/change
  useEffect(() => {
    setSummaryInput(profile.summary);
  }, [profile.summary]);

  const handleSummarySave = () => {
    updateProfile({ summary: summaryInput });
    setEditingSummary(false);
  };

  const handleAddSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim()) {
      addSkill(newSkill.trim());
      setNewSkill('');
    }
  };

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workRole || !workCompany) return;
    await addExperience({
      role: workRole,
      company: workCompany,
      period: workPeriod,
      description: workDesc
    });
    setIsWorkModalOpen(false);
    setWorkRole('');
    setWorkCompany('');
    setWorkPeriod('');
    setWorkDesc('');
  };

  const handleEduSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduDegree || !eduSchool) return;
    await addEducation({
      degree: eduDegree,
      school: eduSchool,
      period: eduPeriod,
      gpa: eduGpa,
      details: eduDetails
    });
    setIsEduModalOpen(false);
    setEduDegree('');
    setEduSchool('');
    setEduPeriod('');
    setEduGpa('');
    setEduDetails('');
  };

  const handleProjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !projDesc) return;
    await addProject({
      name: projName,
      description: projDesc
    });
    setIsProjModalOpen(false);
    setProjName('');
    setProjDesc('');
  };

  // Export CV API call
  const handleExportCV = async () => {
    const token = localStorage.getItem('placement-ai-token');
    const url = `http://localhost:8000/api/profile/export?template=${selectedTemplate}&format=${selectedFormat}`;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', `placement_ai_resume_${selectedTemplate}.${selectedFormat}`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        setIsExportModalOpen(false);
      } else {
        alert("Failed to export resume.");
      }
    } catch(e) {
      console.error("Resume export failed", e);
    }
  };

  return (
    <>
      <PageHeader 
        title="Student Profile"
        subtitle="90% PROFILE COMPLETENESS"
        showSearch={true}
        searchPlaceholder="Search profile..."
        actionButton={
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px' }} onClick={() => setIsExportModalOpen(true)}>
            <Download size={14} /> Export to CV
          </button>
        }
      />
      
      <div className="page-content" id="printable-profile">
        <div className="profile-container">

          {/* PERSONAL INFORMATION */}
          <div className="profile-section" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '32px', marginBottom: '32px' }}>
            <div className="profile-section-header">
              <span className="profile-section-title">Personal Information</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginTop: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>Full Name</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>Email Address</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.05em' }}>Phone Number</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{profile.phone || 'Not Specified'}</div>
              </div>
            </div>
          </div>

          {/* PROFESSIONAL SUMMARY */}
          <div className="profile-section">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <span className="profile-section-title">Professional Summary</span>
              </div>
              {!editingSummary && (
                <button className="profile-section-action-btn" onClick={() => setEditingSummary(true)} aria-label="Edit summary">
                  <Edit2 size={14} />
                </button>
              )}
            </div>

            {editingSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea 
                  className="form-input" 
                  value={summaryInput} 
                  onChange={(e) => setSummaryInput(e.target.value)}
                  style={{ minHeight: '100px', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setEditingSummary(false)} style={{ padding: '6px 14px' }}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSummarySave} style={{ padding: '6px 14px' }}>Save</button>
                </div>
              </div>
            ) : (
              <p className="profile-summary-text">{profile.summary}</p>
            )}
          </div>

          {/* WORK EXPERIENCE */}
          <div className="profile-section">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <span className="profile-section-title">Work Experience</span>
                <span className="profile-check-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.854-9.354a.5.5 0 0 0-.708-.708L7 9.293 5.854 8.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l4.5-4.5z"/>
                  </svg>
                </span>
              </div>
              <button className="profile-section-action-btn" onClick={() => setIsWorkModalOpen(true)} aria-label="Add work experience">
                <Plus size={16} />
              </button>
            </div>

            <div className="profile-item-list">
              {profile.workExperience.map((work) => (
                <div key={work.id}>
                  <div className="profile-item-row">
                    <h4 className="profile-item-title">{work.role}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="profile-item-date">{work.period}</span>
                      <button onClick={() => deleteExperience(work.id as number)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Delete experience">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="profile-item-subtitle">{work.company}</div>
                  <p className="profile-item-desc">{work.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* EDUCATION */}
          <div className="profile-section">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <span className="profile-section-title">Education</span>
                <span className="profile-check-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.854-9.354a.5.5 0 0 0-.708-.708L7 9.293 5.854 8.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l4.5-4.5z"/>
                  </svg>
                </span>
              </div>
              <button className="profile-section-action-btn" onClick={() => setIsEduModalOpen(true)} aria-label="Add education">
                <Plus size={16} />
              </button>
            </div>

            <div className="profile-item-list">
              {profile.education.map((edu) => (
                <div key={edu.id}>
                  <div className="profile-item-row">
                    <h4 className="profile-item-title">{edu.degree}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="profile-item-date">{edu.period}</span>
                      <button onClick={() => deleteEducation(edu.id as number)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Delete education">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="profile-item-subtitle">{edu.school}</div>
                  <p className="profile-item-details">{edu.gpa} • {edu.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SKILLS & INTERESTS */}
          <div className="profile-section">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <span className="profile-section-title">Skills & Interests</span>
              </div>
              <button className="profile-section-action-btn" onClick={() => {
                const el = document.getElementById('skill-input-box');
                el?.focus();
              }} aria-label="Focus skill input">
                <Plus size={16} />
              </button>
            </div>

            <div className="profile-skills-wrap" style={{ marginBottom: '16px' }}>
              {profile.skills.map((skill) => (
                <div key={skill} className="profile-skill-pill">
                  <span>{skill}</span>
                  <span 
                    className="profile-skill-remove-btn" 
                    onClick={() => removeSkill(skill)}
                    aria-label={`Remove ${skill}`}
                  >
                    ×
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSkillSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '300px' }}>
              <input 
                type="text" 
                id="skill-input-box"
                className="form-input" 
                placeholder="Add new skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              />
              <button type="submit" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }}>
                Add
              </button>
            </form>
          </div>

          {/* PROJECTS */}
          <div className="profile-section">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <span className="profile-section-title">Projects</span>
                <span className="profile-check-icon">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.854-9.354a.5.5 0 0 0-.708-.708L7 9.293 5.854 8.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l4.5-4.5z"/>
                  </svg>
                </span>
              </div>
              <button className="profile-section-action-btn" onClick={() => setIsProjModalOpen(true)} aria-label="Add project">
                <Plus size={16} />
              </button>
            </div>

            <div className="profile-item-list">
              {profile.projects.map((proj) => (
                <div key={proj.id} className="profile-project-item">
                  <div className="profile-item-row">
                    <h4 className="profile-project-title" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{proj.name}</h4>
                    <button onClick={() => deleteProject(proj.id as number)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} aria-label="Delete project">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <p className="profile-project-desc">{proj.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CAREER GOALS */}
          <div className="profile-section">
            <div className="profile-section-header">
              <div className="profile-section-title-wrap">
                <span className="profile-section-title">Career Goals</span>
              </div>
              <button className="profile-section-action-btn" aria-label="Add career goal">
                <Plus size={16} />
              </button>
            </div>

            <div className="profile-goal-wrap">
              <div>
                <h4 className="profile-goal-section-title">SHORT-TERM</h4>
                <p className="profile-goal-text">{profile.careerGoalsShort}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Work Modal */}
      <AnimatePresence>
        {isWorkModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add Work Experience</h3>
                <button className="modal-close" onClick={() => setIsWorkModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleWorkSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-work-role">Role / Title</label>
                  <input type="text" id="new-work-role" className="form-input" value={workRole} onChange={e => setWorkRole(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-work-company">Company</label>
                  <input type="text" id="new-work-company" className="form-input" value={workCompany} onChange={e => setWorkCompany(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-work-period">Period (e.g. Jun 2024 - Aug 2024)</label>
                  <input type="text" id="new-work-period" className="form-input" value={workPeriod} onChange={e => setWorkPeriod(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="new-work-desc">Description</label>
                  <textarea className="form-input" id="new-work-desc" value={workDesc} onChange={e => setWorkDesc(e.target.value)} style={{ minHeight: '80px' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-full)' }}>
                  Add Experience
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Education Modal */}
      <AnimatePresence>
        {isEduModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add Education</h3>
                <button className="modal-close" onClick={() => setIsEduModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEduSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-edu-degree">Degree (e.g. M.S. in Computer Science)</label>
                  <input type="text" id="new-edu-degree" className="form-input" value={eduDegree} onChange={e => setEduDegree(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-edu-school">School / University</label>
                  <input type="text" id="new-edu-school" className="form-input" value={eduSchool} onChange={e => setEduSchool(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-edu-period">Period</label>
                  <input type="text" id="new-edu-period" className="form-input" value={eduPeriod} onChange={e => setEduPeriod(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-edu-gpa">GPA (e.g. 3.9/4.0)</label>
                  <input type="text" id="new-edu-gpa" className="form-input" value={eduGpa} onChange={e => setEduGpa(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="new-edu-details">Relevant Details / Coursework</label>
                  <textarea className="form-input" id="new-edu-details" value={eduDetails} onChange={e => setEduDetails(e.target.value)} style={{ minHeight: '80px' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-full)' }}>
                  Add Education
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Modal */}
      <AnimatePresence>
        {isProjModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add Project</h3>
                <button className="modal-close" onClick={() => setIsProjModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleProjSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-proj-name">Project Name</label>
                  <input type="text" id="new-proj-name" className="form-input" value={projName} onChange={e => setProjName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="new-proj-desc">Description</label>
                  <textarea className="form-input" id="new-proj-desc" value={projDesc} onChange={e => setProjDesc(e.target.value)} style={{ minHeight: '80px' }} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-full)' }}>
                  Add Project
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export CV Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ maxWidth: '400px' }}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Export Resume / CV</h3>
                <button className="modal-close" onClick={() => setIsExportModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '16px 0' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="cv-template-select">Select Template</label>
                  <select 
                    id="cv-template-select"
                    className="form-input" 
                    value={selectedTemplate} 
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                  >
                    <option value="ats">ATS-Friendly (Clean & Standard)</option>
                    <option value="modern">Modern Professional (Sleek & Stylized)</option>
                    <option value="europass">Europass Style (European standard)</option>
                    <option value="academic">Academic CV (Detailed)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="cv-format-select">Select Format</label>
                  <select 
                    id="cv-format-select"
                    className="form-input" 
                    value={selectedFormat} 
                    onChange={(e) => setSelectedFormat(e.target.value)}
                  >
                    <option value="pdf">PDF (Printable / Ready to Send)</option>
                    <option value="docx">Word Document (.docx)</option>
                    <option value="json">Raw Data (JSON)</option>
                  </select>
                </div>
              </div>

              <button onClick={handleExportCV} className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-full)' }}>
                Download CV
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Specific CV Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-profile, #printable-profile * {
            visibility: visible;
          }
          #printable-profile {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .sidebar, .header, button, form, .btn {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
