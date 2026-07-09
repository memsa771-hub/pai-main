'use client';

import React, { useState } from 'react';
import { useApp, AppSettings, UserProfile } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { 
  User, Settings, Sparkles, Bell, ToggleLeft, ToggleRight, Check, AlertCircle, Save 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { settings, profile, updateSettings, updateProfile } = useApp();
  const [activeSection, setActiveSection] = useState<'profile' | 'system' | 'ai'>('profile');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [targetSemester, setTargetSemester] = useState('Fall 2025');
  const [targetDegree, setTargetDegree] = useState('Master of Computer Science (MSCS)');
  
  const [aiModel, setAiModel] = useState(settings.aiModel);
  const [aiTone, setAiTone] = useState(settings.aiTone);
  const [aiDetail, setAiDetail] = useState(settings.aiDetail);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: displayName,
      email: email
    });
    triggerSuccessAlert();
  };

  const handleAiSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      aiModel,
      aiTone,
      aiDetail
    });
    triggerSuccessAlert();
  };

  const triggerSuccessAlert = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleToggle = (key: keyof AppSettings) => {
    if (key === 'theme') {
      const newTheme = settings.theme === 'light' ? 'dark' : 'light';
      updateSettings({ theme: newTheme });
    } else {
      updateSettings({ [key]: !settings[key] });
    }
  };

  return (
    <>
      <PageHeader 
        title="Settings"
        subtitle="Manage your personal profile, AI configurations, and system preferences."
      />
      <div className="page-content">

        {/* Save success toast banner */}
        {saveSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: '16px 20px',
              background: 'var(--success-light)',
              color: 'var(--success)',
              border: '1px solid var(--success-border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 600,
              fontSize: '14px',
              marginBottom: '24px'
            }}
          >
            <Check size={18} /> Settings successfully saved!
          </motion.div>
        )}

        {/* Settings grid split */}
        <div className="settings-grid">
          
          {/* Left Column: Settings Navigation */}
          <div className="settings-nav">
            <button 
              className={`settings-nav-btn ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSection('profile')}
            >
              <User size={18} /> Profile Details
            </button>
            <button 
              className={`settings-nav-btn ${activeSection === 'system' ? 'active' : ''}`}
              onClick={() => setActiveSection('system')}
            >
              <Settings size={18} /> System Settings
            </button>
            <button 
              className={`settings-nav-btn ${activeSection === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveSection('ai')}
            >
              <Sparkles size={18} /> AI Consultant
            </button>
          </div>

          {/* Right Column: Settings Content Panels */}
          <div className="settings-panel">
            
            {/* PROFILE SETTINGS PANEL */}
            {activeSection === 'profile' && (
              <form onSubmit={handleProfileSave}>
                <h3 className="settings-section-title">Profile Settings</h3>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="display-name">Display Name</label>
                  <input 
                    type="text" 
                    id="display-name"
                    className="form-input" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email-settings">Email Address</label>
                  <input 
                    type="email" 
                    id="email-settings"
                    className="form-input" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="target-semester">Target Semester</label>
                  <select 
                    id="target-semester"
                    className="form-input" 
                    value={targetSemester} 
                    onChange={e => setTargetSemester(e.target.value)}
                  >
                    <option value="Fall 2025">Fall 2025</option>
                    <option value="Spring 2026">Spring 2026</option>
                    <option value="Fall 2026">Fall 2026</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '28px' }}>
                  <label className="form-label" htmlFor="target-degree">Target Degree</label>
                  <input 
                    type="text" 
                    id="target-degree"
                    className="form-input" 
                    placeholder="e.g. Master of Computer Science" 
                    value={targetDegree} 
                    onChange={e => setTargetDegree(e.target.value)} 
                    required 
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Profile Details
                </button>
              </form>
            )}

            {/* SYSTEM SETTINGS PANEL */}
            {activeSection === 'system' && (
              <div>
                <h3 className="settings-section-title">System Settings</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {/* Theme Switcher Toggle */}
                  <div className="toggle-switch">
                    <div className="toggle-info">
                      <span className="toggle-label">Dark Mode Theme</span>
                      <span className="toggle-desc">Switch interface to optimized low-light dark mode.</span>
                    </div>
                    <label className="switch-input" aria-label="Toggle dark mode theme">
                      <input 
                        type="checkbox" 
                        checked={settings.theme === 'dark'} 
                        onChange={() => handleToggle('theme')}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  {/* Email Notifications Toggle */}
                  <div className="toggle-switch">
                    <div className="toggle-info">
                      <span className="toggle-label">Email Notifications</span>
                      <span className="toggle-desc">Receive application reminders and deadlines reports.</span>
                    </div>
                    <label className="switch-input" aria-label="Toggle email notifications">
                      <input 
                        type="checkbox" 
                        checked={settings.emailNotifications} 
                        onChange={() => handleToggle('emailNotifications')}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  {/* Weekly Digest Toggle */}
                  <div className="toggle-switch">
                    <div className="toggle-info">
                      <span className="toggle-label">Weekly Insight Digest</span>
                      <span className="toggle-desc">Weekly analytical report regarding your universities admission logs.</span>
                    </div>
                    <label className="switch-input" aria-label="Toggle weekly insight digest">
                      <input 
                        type="checkbox" 
                        checked={settings.weeklyDigest} 
                        onChange={() => handleToggle('weeklyDigest')}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  {/* Desktop Notifications Toggle */}
                  <div className="toggle-switch" style={{ borderBottom: 'none' }}>
                    <div className="toggle-info">
                      <span className="toggle-label">Real-time Browser Push Notifications</span>
                      <span className="toggle-desc">Get instant notifications regarding documents scanning status.</span>
                    </div>
                    <label className="switch-input" aria-label="Toggle browser push notifications">
                      <input 
                        type="checkbox" 
                        checked={settings.desktopNotifications} 
                        onChange={() => handleToggle('desktopNotifications')}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                </div>
              </div>
            )}

            {/* AI CONSULTANT PANEL */}
            {activeSection === 'ai' && (
              <form onSubmit={handleAiSave}>
                <h3 className="settings-section-title">AI Consultant Configuration</h3>

                <div className="form-group">
                  <label className="form-label" htmlFor="ai-model-select">Primary Optimization AI Model</label>
                  <select 
                    id="ai-model-select"
                    className="form-input" 
                    value={aiModel} 
                    onChange={e => setAiModel(e.target.value)}
                  >
                    <option value="Gemini 3.5 Flash">Gemini 3.5 Flash (Medium)</option>
                    <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (Heavy)</option>
                    <option value="GPT-4o">GPT-4o (Standard)</option>
                    <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (Drafting Specialist)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="ai-tone-select">Consultant Speech Tone</label>
                  <select 
                    id="ai-tone-select"
                    className="form-input" 
                    value={aiTone} 
                    onChange={e => setAiTone(e.target.value)}
                  >
                    <option value="Professional & Encouraging">Professional & Encouraging</option>
                    <option value="Academic & Rigorous">Academic & Rigorous</option>
                    <option value="Direct & Analytical">Direct & Analytical</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '28px' }}>
                  <label className="form-label" htmlFor="ai-detail-select">Feedback Granularity</label>
                  <select 
                    id="ai-detail-select"
                    className="form-input" 
                    value={aiDetail} 
                    onChange={e => setAiDetail(e.target.value)}
                  >
                    <option value="Concise">Concise (Bullet points only)</option>
                    <option value="Balanced">Balanced (Standard suggestions)</option>
                    <option value="Detailed">Detailed (Full draft inline breakdown)</option>
                  </select>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save AI Configuration
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
