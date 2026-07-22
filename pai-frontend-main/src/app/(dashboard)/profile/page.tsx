'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, GraduationCap, Briefcase, Target, Globe, Save, Plus, X, Loader2, Edit3 } from 'lucide-react';
import './profile.css';

export default function ProfilePage() {
  const {
    profile, updateProfile, addEducation, deleteEducation,
    addExperience, deleteExperience, addProject, deleteProject,
    addSkill, removeSkill, addLanguage, removeLanguage,
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...profile });
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newEducation, setNewEducation] = useState({ degree: '', school: '', major: '', period: '', gpa: '' });
  const [newExperience, setNewExperience] = useState({ role: '', company: '', period: '', description: '' });
  const [newProject, setNewProject] = useState({ name: '', description: '', link_or_credential: '' });
  const [showAddEducation, setShowAddEducation] = useState(false);
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    await updateProfile(editData);
    setSaving(false);
    setIsEditing(false);
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) return;
    await addSkill(newSkill.trim());
    setNewSkill('');
  };

  const handleAddLanguage = async () => {
    if (!newLanguage.trim()) return;
    await addLanguage(newLanguage.trim());
    setNewLanguage('');
  };

  const handleAddEducation = async () => {
    if (!newEducation.school || !newEducation.degree) return;
    await addEducation(newEducation);
    setNewEducation({ degree: '', school: '', major: '', period: '', gpa: '' });
    setShowAddEducation(false);
  };

  const handleAddExperience = async () => {
    if (!newExperience.role || !newExperience.company) return;
    await addExperience(newExperience);
    setNewExperience({ role: '', company: '', period: '', description: '' });
    setShowAddExperience(false);
  };

  const handleAddProject = async () => {
    if (!newProject.name) return;
    await addProject(newProject);
    setNewProject({ name: '', description: '', link_or_credential: '' });
    setShowAddProject(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff',
  };

  const sectionStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #f1f5f9',
    padding: '24px',
    marginBottom: '20px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '900px' }}>
      <PageHeader title="My Profile" subtitle="Manage your personal and academic information" />

      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff', fontSize: '24px', fontWeight: 700,
          }}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              {profile.name || 'Your Name'}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{profile.email}</p>
          </div>
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
              background: '#ffffff', color: '#64748b', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <Edit3 size={14} /> {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {isEditing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Full Name</label>
              <input style={inputStyle} value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Phone</label>
              <input style={inputStyle} value={editData.phone || ''} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Country</label>
              <input style={inputStyle} value={editData.country || ''} onChange={(e) => setEditData({ ...editData, country: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>City</label>
              <input style={inputStyle} value={editData.city || ''} onChange={(e) => setEditData({ ...editData, city: e.target.value })} />
            </div>
          </div>
        )}

        {isEditing && (
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: '#2563eb', color: '#ffffff', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
            Save Changes
          </button>
        )}
      </motion.div>

      {/* Quick Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {[
          { icon: <Mail size={16} />, label: 'Email', value: profile.email },
          { icon: <Phone size={16} />, label: 'Phone', value: profile.phone || 'Not set' },
          { icon: <MapPin size={16} />, label: 'Location', value: [profile.city, profile.country].filter(Boolean).join(', ') || 'Not set' },
          { icon: <Globe size={16} />, label: 'Nationality', value: profile.nationality || 'Not set' },
          { icon: <GraduationCap size={16} />, label: 'Education', value: profile.current_education || 'Not set' },
          { icon: <Target size={16} />, label: 'Target Degree', value: profile.intended_degree || 'Not set' },
        ].map((item, idx) => (
          <div key={idx} style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #f1f5f9', padding: '16px' }}>
            <div style={{ color: '#2563eb', marginBottom: '6px' }}>{item.icon}</div>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 2px 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
            <p style={{ fontSize: '14px', color: '#334155', margin: 0, fontWeight: 500 }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Skills */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={sectionStyle}>
        <h3 style={sectionTitleStyle}><Target size={18} /> Skills</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {profile.skills.map((skill) => (
            <span key={skill} style={{
              padding: '6px 14px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb',
              fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {skill}
              <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeSkill(skill)} />
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Add a skill..." value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()} />
          <button onClick={handleAddSkill} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>Add</button>
        </div>
      </motion.div>

      {/* Languages */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={sectionStyle}>
        <h3 style={sectionTitleStyle}><Globe size={18} /> Languages</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {profile.languages.map((lang) => (
            <span key={lang} style={{ padding: '6px 14px', borderRadius: '20px', background: '#f0fdf4', color: '#16a34a', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {lang}
              <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeLanguage(lang)} />
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Add a language..." value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddLanguage()} />
          <button onClick={handleAddLanguage} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>Add</button>
        </div>
      </motion.div>

      {/* Education */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={sectionStyle}>
        <h3 style={sectionTitleStyle}><GraduationCap size={18} /> Education</h3>
        {profile.education.map((edu: any) => (
          <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>{edu.degree} - {edu.school}</p>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{edu.major}{edu.period ? ` • ${edu.period}` : ''}{edu.gpa ? ` • GPA: ${edu.gpa}` : ''}</p>
            </div>
            <X size={16} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => deleteEducation(edu.id)} />
          </div>
        ))}
        {showAddEducation ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
            <input style={inputStyle} placeholder="Degree" value={newEducation.degree} onChange={(e) => setNewEducation({ ...newEducation, degree: e.target.value })} />
            <input style={inputStyle} placeholder="School" value={newEducation.school} onChange={(e) => setNewEducation({ ...newEducation, school: e.target.value })} />
            <input style={inputStyle} placeholder="Major" value={newEducation.major} onChange={(e) => setNewEducation({ ...newEducation, major: e.target.value })} />
            <input style={inputStyle} placeholder="Period (e.g. 2020-2024)" value={newEducation.period} onChange={(e) => setNewEducation({ ...newEducation, period: e.target.value })} />
            <input style={inputStyle} placeholder="GPA" value={newEducation.gpa} onChange={(e) => setNewEducation({ ...newEducation, gpa: e.target.value })} />
            <div style={{ display: 'flex', gap: '8px', gridColumn: '1 / -1' }}>
              <button onClick={handleAddEducation} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>Save</button>
              <button onClick={() => setShowAddEducation(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddEducation(true)} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px dashed #e2e8f0', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add Education
          </button>
        )}
      </motion.div>

      {/* Work Experience */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={sectionStyle}>
        <h3 style={sectionTitleStyle}><Briefcase size={18} /> Work Experience</h3>
        {profile.workExperience.map((exp: any) => (
          <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px 0' }}>{exp.role}</p>
              <p style={{ fontSize: '13px', color: '#2563eb', margin: '0 0 4px 0', fontWeight: 500 }}>{exp.company}</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px 0' }}>{exp.period}</p>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{exp.description}</p>
            </div>
            <X size={16} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => deleteExperience(exp.id)} />
          </div>
        ))}
        {showAddExperience ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <input style={inputStyle} placeholder="Role / Position" value={newExperience.role} onChange={(e) => setNewExperience({ ...newExperience, role: e.target.value })} />
            <input style={inputStyle} placeholder="Company" value={newExperience.company} onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })} />
            <input style={inputStyle} placeholder="Period (e.g. 2022-2024)" value={newExperience.period} onChange={(e) => setNewExperience({ ...newExperience, period: e.target.value })} />
            <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Description" value={newExperience.description} onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleAddExperience} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>Save</button>
              <button onClick={() => setShowAddExperience(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddExperience(true)} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px dashed #e2e8f0', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add Experience
          </button>
        )}
      </motion.div>

      {/* Projects */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={sectionStyle}>
        <h3 style={sectionTitleStyle}><Target size={18} /> Projects</h3>
        {profile.projects.map((proj: any) => (
          <div key={proj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0' }}>{proj.name}</p>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>{proj.description}</p>
              {proj.link_or_credential && (
                <a href={proj.link_or_credential} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'underline' }}>
                  {proj.link_or_credential}
                </a>
              )}
            </div>
            <X size={16} style={{ cursor: 'pointer', color: '#94a3b8' }} onClick={() => deleteProject(proj.id)} />
          </div>
        ))}
        {showAddProject ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <input style={inputStyle} placeholder="Project Name" value={newProject.name} onChange={(e) => setNewProject({ ...newProject, name: e.target.value })} />
            <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} />
            <input style={inputStyle} placeholder="Link or credential" value={newProject.link_or_credential} onChange={(e) => setNewProject({ ...newProject, link_or_credential: e.target.value })} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleAddProject} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>Save</button>
              <button onClick={() => setShowAddProject(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddProject(true)} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px', border: '1px dashed #e2e8f0', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add Project
          </button>
        )}
      </motion.div>
    </div>
  );
}