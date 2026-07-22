'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Sun, Moon, Bot, Bell, Mail, Monitor, Save, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    updateSettings(localSettings);
    setTimeout(() => setSaving(false), 500);
  };

  const toggleSwitchStyle = (active: boolean): React.CSSProperties => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    background: active ? '#10b981' : '#cbd5e1',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    border: 'none',
    padding: 0,
  });

  const toggleDotStyle = (active: boolean): React.CSSProperties => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#ffffff',
    position: 'absolute',
    top: '2px',
    left: active ? '22px' : '2px',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  });

  const sectionStyle: React.CSSProperties = {
    background: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9',
    padding: '24px', marginBottom: '20px',
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '700px' }}>
      <PageHeader title="Settings" subtitle="Customize your experience" />

      {/* Theme */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={18} /> Appearance
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: 0 }}>Theme</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>Choose between light and dark mode</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setLocalSettings({ ...localSettings, theme: 'light' })}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                background: localSettings.theme === 'light' ? '#eff6ff' : '#ffffff',
                color: localSettings.theme === 'light' ? '#2563eb' : '#64748b',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Sun size={14} /> Light
            </button>
            <button
              onClick={() => setLocalSettings({ ...localSettings, theme: 'dark' })}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
                background: localSettings.theme === 'dark' ? '#eff6ff' : '#ffffff',
                color: localSettings.theme === 'dark' ? '#2563eb' : '#64748b',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Moon size={14} /> Dark
            </button>
          </div>
        </div>
      </motion.div>

      {/* AI Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={18} /> AI Preferences
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>AI Model</label>
            <select
              value={localSettings.aiModel}
              onChange={(e) => setLocalSettings({ ...localSettings, aiModel: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="DeepSeek Chat (V3)">DeepSeek Chat (V3)</option>
              <option value="GPT-4o">GPT-4o</option>
              <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>AI Tone</label>
            <select
              value={localSettings.aiTone}
              onChange={(e) => setLocalSettings({ ...localSettings, aiTone: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="Professional & Encouraging">Professional & Encouraging</option>
              <option value="Casual & Friendly">Casual & Friendly</option>
              <option value="Academic & Formal">Academic & Formal</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} /> Notifications
        </h3>
        {[
          { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive updates via email' },
          { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Get a weekly summary of your progress' },
          { key: 'desktopNotifications', label: 'Desktop Notifications', desc: 'Receive push notifications in browser' },
        ].map((item) => (
          <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#334155', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>{item.desc}</p>
            </div>
            <button
              onClick={() => setLocalSettings({ ...localSettings, [item.key]: !(localSettings as any)[item.key] })}
              style={toggleSwitchStyle((localSettings as any)[item.key])}
            >
              <div style={toggleDotStyle((localSettings as any)[item.key])} />
            </button>
          </div>
        ))}
      </motion.div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 28px', borderRadius: '10px', border: 'none',
            background: '#2563eb', color: '#ffffff', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
          Save Settings
        </button>
      </div>
    </div>
  );
}