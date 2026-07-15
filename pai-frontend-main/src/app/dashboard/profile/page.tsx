'use client';

import React, { useState, useEffect } from 'react';
import { useApp, WorkExperience, Education, ProjectItem } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { 
  Plus, Edit2, Download, Trash2, X, Globe, Mail, Phone, MapPin, Link2, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './profile.css';

export default function MyProfilePage() {
  const { 
    profile, 
    addSkill, 
    removeSkill, 
    addLanguage,
    removeLanguage,
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
  const [newLanguage, setNewLanguage] = useState('');
  
  // Exporter Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('ats');
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  // Modals for adding/editing items
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isEduModalOpen, setIsEduModalOpen] = useState(false);
  const [isProjModalOpen, setIsProjModalOpen] = useState(false);

  // Personal Info Form inputs
  const [infoName, setInfoName] = useState(profile.name);
  const [infoPhone, setInfoPhone] = useState(profile.phone || '');
  const [infoCity, setInfoCity] = useState(profile.city || '');
  const [infoCountry, setInfoCountry] = useState(profile.country || '');
  const [infoLinkedin, setInfoLinkedin] = useState(profile.linkedin || '');
  const [infoAvatar, setInfoAvatar] = useState(profile.avatar || '');

  // Work Experience Form inputs
  const [workRole, setWorkRole] = useState('');
  const [workCompany, setWorkCompany] = useState('');
  const [workStartDate, setWorkStartDate] = useState('');
  const [workEndDate, setWorkEndDate] = useState('');
  const [workDesc, setWorkDesc] = useState('');
  const [workAchievements, setWorkAchievements] = useState('');

  // Education Form inputs
  const [eduDegree, setEduDegree] = useState('');
  const [eduSchool, setEduSchool] = useState('');
  const [eduMajor, setEduMajor] = useState('');
  const [eduGradYear, setEduGradYear] = useState('');
  const [eduGpa, setEduGpa] = useState('');
  const [eduDetails, setEduDetails] = useState('');

  // Projects Form inputs
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projLink, setProjLink] = useState('');

  // Sync states on profile loads
  useEffect(() => {
    setSummaryInput(profile.summary);
    setInfoName(profile.name);
    setInfoPhone(profile.phone || '');
    setInfoCity(profile.city || '');
    setInfoCountry(profile.country || '');
    setInfoLinkedin(profile.linkedin || '');
    setInfoAvatar(profile.avatar || '');
  }, [profile]);

  const handleSummarySave = () => {
    updateProfile({ summary: summaryInput });
    setEditingSummary(false);
  };

  const handlePersonalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      name: infoName,
      phone: infoPhone,
      city: infoCity,
      country: infoCountry,
      linkedin: infoLinkedin,
      avatar: infoAvatar
    });
    setIsPersonalInfoModalOpen(false);
  };

  const handleAddSkillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim()) {
      addSkill(newSkill.trim());
      setNewSkill('');
    }
  };

  const handleAddLanguageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLanguage.trim()) {
      addLanguage(newLanguage.trim());
      setNewLanguage('');
    }
  };

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workRole || !workCompany) return;
    const achievementsList = workAchievements.split('\n').map(a => a.trim()).filter(a => a);
    const period = workStartDate && workEndDate ? `${workStartDate} - ${workEndDate}` : workStartDate || workEndDate || '';
    await addExperience({
      role: workRole,
      company: workCompany,
      period,
      start_date: workStartDate,
      end_date: workEndDate || 'Present',
      description: workDesc,
      achievements: achievementsList
    });
    setIsWorkModalOpen(false);
    setWorkRole('');
    setWorkCompany('');
    setWorkStartDate('');
    setWorkEndDate('');
    setWorkDesc('');
    setWorkAchievements('');
  };

  const handleEduSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduDegree || !eduSchool) return;
    await addEducation({
      degree: eduDegree,
      school: eduSchool,
      major: eduMajor,
      period: eduGradYear ? `Class of ${eduGradYear}` : '',
      graduation_year: eduGradYear,
      gpa: eduGpa,
      details: eduDetails
    });
    setIsEduModalOpen(false);
    setEduDegree('');
    setEduSchool('');
    setEduMajor('');
    setEduGradYear('');
    setEduGpa('');
    setEduDetails('');
  };

  const handleProjSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName) return;
    await addProject({
      name: projName,
      description: projDesc,
      link_or_credential: projLink
    });
    setIsProjModalOpen(false);
    setProjName('');
    setProjDesc('');
    setProjLink('');
  };

  // Export CV API call
  const handleExportCV = async () => {
    const token = localStorage.getItem('placement-ai-token');
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    const url = `${apiBaseUrl}/api/profile/export?template=${selectedTemplate}&format=${selectedFormat}`;
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

  const formatDateRange = (work: WorkExperience) => {
    if (work.start_date) {
      return `${work.start_date} - ${work.end_date || 'Present'}`;
    }
    return work.period || '';
  };

  const hasExperience = profile.workExperience.length > 0;
  const hasEducation = profile.education.length > 0;
  const hasProjects = profile.projects.length > 0;

  // Build profile image initials fallback
  const getInitials = (fullName: string) => {
    if (!fullName) return '?';
    return fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <>
      <PageHeader 
        title=""
        subtitle=""
        showSearch={false}
        actionButton={
          <button 
            className="btn btn-primary" 
            style={{ 
              padding: '8px 24px', 
              fontSize: '13px', 
              fontWeight: 700,
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              height: '38px',
              borderRadius: '20px',
              background: '#002d9c',
              border: 'none',
              boxShadow: 'none'
            }} 
            onClick={() => setIsExportModalOpen(true)}
          >
            Export to CV
          </button>
        }
      />
      
      <div className="page-content" id="printable-profile">
        <div className="profile-container">

          <div className="profile-cv-sheet">
            
            {/* ── CV HEADER SECTION (Round avatar + Contact Info dynamically populated) ── */}
            <div className="profile-cv-header">
              <div className="profile-cv-avatar-wrap" onClick={() => setIsPersonalInfoModalOpen(true)}>
                {profile.avatar && profile.avatar !== '/avatar.webp' ? (
                  <img src={profile.avatar} alt={profile.name} className="profile-cv-avatar-img" />
                ) : (
                  <div className="profile-cv-avatar-fallback">{getInitials(profile.name)}</div>
                )}
                <div className="profile-cv-avatar-overlay">
                  <Camera size={16} />
                </div>
              </div>

              <div className="profile-cv-info">
                <div className="profile-cv-name-row">
                  <h1 className="profile-cv-name">{profile.name}</h1>
                  <button 
                    className="profile-section-action-btn" 
                    onClick={() => setIsPersonalInfoModalOpen(true)}
                    aria-label="Edit personal information"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>

                <div className="profile-cv-contact-row">
                  <div className="profile-cv-contact-item">
                    <Mail size={13} />
                    <span>{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="profile-cv-contact-item">
                      <Phone size={13} />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                  {(profile.city || profile.country) && (
                    <div className="profile-cv-contact-item">
                      <MapPin size={13} />
                      <span>{[profile.city, profile.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {profile.linkedin && (
                    <div className="profile-cv-contact-item">
                      <Link2 size={13} />
                      <a href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                        LinkedIn
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── COMPLETENESS PROGRESS ── */}
            <div className="profile-progress-section">
              <div className="profile-progress-header">
                <span className="profile-progress-title">PROFILE VAULT COMPLETENESS</span>
                <span className="profile-completeness-text">90% COMPLETE</span>
              </div>
              <div className="profile-progress-bar-container">
                <div className="profile-progress-bar-fill" style={{ width: '90%' }} />
              </div>
            </div>

            {/* ── PROFESSIONAL SUMMARY ── */}
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
                <p className="profile-summary-text">
                  {profile.summary || 'Click the edit icon to add your professional summary.'}
                </p>
              )}
            </div>

            {/* ── WORK EXPERIENCE ── */}
            <div className="profile-section">
              <div className="profile-section-header">
                <div className="profile-section-title-wrap">
                  <span className="profile-section-title">Work Experience</span>
                  {hasExperience && (
                    <span className="profile-check-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.854-9.354a.5.5 0 0 0-.708-.708L7 9.293 5.854 8.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l4.5-4.5z"/>
                      </svg>
                    </span>
                  )}
                </div>
                <button className="profile-section-action-btn" onClick={() => setIsWorkModalOpen(true)} aria-label="Add work experience">
                  <Plus size={16} />
                </button>
              </div>

              <div className="profile-item-list">
                {profile.workExperience.map((work) => (
                  <div key={work.id} className="profile-cv-item-block">
                    <div className="profile-item-row">
                      <h4 className="profile-item-title">{work.role}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="profile-item-date">{formatDateRange(work)}</span>
                        <button 
                          onClick={() => deleteExperience(work.id as number)} 
                          className="profile-cv-delete-action"
                          aria-label="Delete experience"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="profile-item-subtitle">{work.company}</div>
                    {work.achievements && work.achievements.length > 0 ? (
                      <ul style={{ paddingLeft: '18px', marginTop: '6px', listStyleType: 'disc' }}>
                        {work.achievements.map((ach, i) => (
                          <li key={i} className="profile-item-desc" style={{ marginBottom: '3px' }}>{ach}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="profile-item-desc">{work.description}</p>
                    )}
                  </div>
                ))}
                {!hasExperience && <p className="profile-item-desc" style={{ fontStyle: 'italic' }}>No experience listed yet.</p>}
              </div>
            </div>

            {/* ── EDUCATION ── */}
            <div className="profile-section">
              <div className="profile-section-header">
                <div className="profile-section-title-wrap">
                  <span className="profile-section-title">Education</span>
                  {hasEducation && (
                    <span className="profile-check-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.854-9.354a.5.5 0 0 0-.708-.708L7 9.293 5.854 8.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l4.5-4.5z"/>
                      </svg>
                    </span>
                  )}
                </div>
                <button className="profile-section-action-btn" onClick={() => setIsEduModalOpen(true)} aria-label="Add education">
                  <Plus size={16} />
                </button>
              </div>

              <div className="profile-item-list">
                {profile.education.map((edu) => {
                  const degreeStr = edu.degree + (edu.major ? ` in ${edu.major}` : '');
                  const dateStr = edu.graduation_year ? `Expected ${edu.graduation_year}` : edu.period;
                  return (
                    <div key={edu.id} className="profile-cv-item-block">
                      <div className="profile-item-row">
                        <h4 className="profile-item-title">{degreeStr}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="profile-item-date">{dateStr}</span>
                          <button 
                            onClick={() => deleteEducation(edu.id as number)} 
                            className="profile-cv-delete-action"
                            aria-label="Delete education"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="profile-item-subtitle">{edu.school}</div>
                      <p className="profile-item-details" style={{ fontSize: '13px', color: '#64748b' }}>
                        {edu.gpa ? `GPA: ${edu.gpa}` : ''}
                        {edu.details ? ` • Relevant Coursework: ${edu.details}` : ''}
                      </p>
                    </div>
                  );
                })}
                {!hasEducation && <p className="profile-item-desc" style={{ fontStyle: 'italic' }}>No education listed yet.</p>}
              </div>
            </div>

            {/* ── SKILLS & INTERESTS ── */}
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
                {profile.skills.length === 0 && <p className="profile-item-desc" style={{ fontStyle: 'italic' }}>No skills added yet.</p>}
              </div>

              <form onSubmit={handleAddSkillSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '300px' }}>
                <input 
                  type="text" 
                  id="skill-input-box"
                  className="form-input" 
                  placeholder="Add skill..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                />
                <button type="submit" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }}>
                  Add
                </button>
              </form>
            </div>

            {/* ── LANGUAGES ── */}
            <div className="profile-section">
              <div className="profile-section-header">
                <div className="profile-section-title-wrap">
                  <span className="profile-section-title">Languages</span>
                </div>
                <button className="profile-section-action-btn" onClick={() => {
                  const el = document.getElementById('language-input-box');
                  el?.focus();
                }} aria-label="Focus language input">
                  <Plus size={16} />
                </button>
              </div>

              <div className="profile-skills-wrap" style={{ marginBottom: '16px' }}>
                {profile.languages.map((lang) => (
                  <div key={lang} className="profile-skill-pill" style={{ background: '#ecfdf5', color: '#047857', borderColor: 'rgba(4, 120, 87, 0.08)' }}>
                    <span>{lang}</span>
                    <span 
                      className="profile-skill-remove-btn" 
                      style={{ color: '#10b981' }}
                      onClick={() => removeLanguage(lang)}
                      aria-label={`Remove ${lang}`}
                    >
                      ×
                    </span>
                  </div>
                ))}
                {profile.languages.length === 0 && <p className="profile-item-desc" style={{ fontStyle: 'italic' }}>No languages added yet.</p>}
              </div>

              <form onSubmit={handleAddLanguageSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '300px' }}>
                <input 
                  type="text" 
                  id="language-input-box"
                  className="form-input" 
                  placeholder="Add language..."
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                />
                <button type="submit" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '13px' }}>
                  Add
                </button>
              </form>
            </div>

            {/* ── PROJECTS ── */}
            <div className="profile-section">
              <div className="profile-section-header">
                <div className="profile-section-title-wrap">
                  <span className="profile-section-title">Projects</span>
                  {hasProjects && (
                    <span className="profile-check-icon">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.854-9.354a.5.5 0 0 0-.708-.708L7 9.293 5.854 8.146a.5.5 0 1 0-.708.708l1.5 1.5a.5.5 0 0 0 .708 0l4.5-4.5z"/>
                      </svg>
                    </span>
                  )}
                </div>
                <button className="profile-section-action-btn" onClick={() => setIsProjModalOpen(true)} aria-label="Add project">
                  <Plus size={16} />
                </button>
              </div>

              <div className="profile-item-list">
                {profile.projects.map((proj) => (
                  <div key={proj.id} className="profile-project-item profile-cv-item-block">
                    <div className="profile-item-row" style={{ marginBottom: '2px' }}>
                      <h4 className="profile-project-title" style={{ fontWeight: 700 }}>{proj.name}</h4>
                      <button 
                        onClick={() => deleteProject(proj.id as number)} 
                        className="profile-cv-delete-action"
                        aria-label="Delete project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="profile-project-desc">{proj.description}</p>
                    {proj.link_or_credential && (
                      <p style={{ fontStyle: 'italic', fontSize: '12px', color: '#3b82f6', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Link2 size={11} />
                        <a href={proj.link_or_credential.startsWith('http') ? proj.link_or_credential : `https://${proj.link_or_credential}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                          {proj.link_or_credential}
                        </a>
                      </p>
                    )}
                  </div>
                ))}
                {!hasProjects && <p className="profile-item-desc" style={{ fontStyle: 'italic' }}>No projects listed yet.</p>}
              </div>
            </div>

            {/* ── CAREER GOALS ── */}
            <div className="profile-section" style={{ marginBottom: 0 }}>
              <div className="profile-section-header">
                <div className="profile-section-title-wrap">
                  <span className="profile-section-title">Career Goals</span>
                </div>
              </div>

              <div className="profile-goal-wrap">
                <div>
                  <h4 className="profile-goal-section-title">SHORT-TERM</h4>
                  <p className="profile-goal-text">{profile.careerGoalsShort || '—'}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         MODALS (Add, Edit, Exporter)
         ═══════════════════════════════════════════════════════════════ */}

      {/* Personal Info Modal */}
      <AnimatePresence>
        {isPersonalInfoModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="modal-header">
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Edit Personal Information</h3>
                <button className="modal-close" onClick={() => setIsPersonalInfoModalOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handlePersonalInfoSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-info-name">Full Name</label>
                  <input type="text" id="new-info-name" className="form-input" value={infoName} onChange={e => setInfoName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-info-phone">Phone Number</label>
                  <input type="text" id="new-info-phone" className="form-input" value={infoPhone} onChange={e => setInfoPhone(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-info-city">City</label>
                    <input type="text" id="new-info-city" className="form-input" placeholder="e.g. Berkeley" value={infoCity} onChange={e => setInfoCity(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-info-country">Country</label>
                    <input type="text" id="new-info-country" className="form-input" placeholder="e.g. USA" value={infoCountry} onChange={e => setInfoCountry(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-info-linkedin">LinkedIn URL</label>
                  <input type="text" id="new-info-linkedin" className="form-input" placeholder="linkedin.com/in/username" value={infoLinkedin} onChange={e => setInfoLinkedin(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="new-info-avatar">Profile Image URL</label>
                  <input type="text" id="new-info-avatar" className="form-input" placeholder="https://..." value={infoAvatar} onChange={e => setInfoAvatar(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', borderRadius: 'var(--radius-full)' }}>
                  Save Personal Info
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Work Experience Modal */}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-work-start">Start Date</label>
                    <input type="text" id="new-work-start" className="form-input" placeholder="e.g. Jun 2023" value={workStartDate} onChange={e => setWorkStartDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-work-end">End Date</label>
                    <input type="text" id="new-work-end" className="form-input" placeholder="e.g. Present" value={workEndDate} onChange={e => setWorkEndDate(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-work-desc">Description (optional)</label>
                  <textarea className="form-input" id="new-work-desc" value={workDesc} onChange={e => setWorkDesc(e.target.value)} style={{ minHeight: '60px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="new-work-achievements">Achievements (one per line)</label>
                  <textarea className="form-input" id="new-work-achievements" value={workAchievements} onChange={e => setWorkAchievements(e.target.value)} style={{ minHeight: '80px' }} placeholder={"Developed a real-time data visualization dashboard...\nCollaborated with cross-functional teams..."} />
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
                  <label className="form-label" htmlFor="new-edu-degree">Degree (e.g. B.S., M.S., Ph.D.)</label>
                  <input type="text" id="new-edu-degree" className="form-input" value={eduDegree} onChange={e => setEduDegree(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-edu-major">Major / Field of Study</label>
                  <input type="text" id="new-edu-major" className="form-input" placeholder="e.g. Computer Science" value={eduMajor} onChange={e => setEduMajor(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-edu-school">School / University</label>
                  <input type="text" id="new-edu-school" className="form-input" value={eduSchool} onChange={e => setEduSchool(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-edu-gradyear">Graduation Year</label>
                    <input type="text" id="new-edu-gradyear" className="form-input" placeholder="e.g. May 2025" value={eduGradYear} onChange={e => setEduGradYear(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-edu-gpa">GPA (e.g. 3.8/4.0)</label>
                    <input type="text" id="new-edu-gpa" className="form-input" value={eduGpa} onChange={e => setEduGpa(e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="new-edu-details">Relevant Details / Coursework</label>
                  <textarea className="form-input" id="new-edu-details" value={eduDetails} onChange={e => setEduDetails(e.target.value)} style={{ minHeight: '60px' }} />
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
                <div className="form-group">
                  <label className="form-label" htmlFor="new-proj-desc">Description</label>
                  <textarea className="form-input" id="new-proj-desc" value={projDesc} onChange={e => setProjDesc(e.target.value)} style={{ minHeight: '80px' }} required />
                </div>
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="new-proj-link">Link / Credential ID (optional)</label>
                  <input type="text" id="new-proj-link" className="form-input" placeholder="https://..." value={projLink} onChange={e => setProjLink(e.target.value)} />
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
