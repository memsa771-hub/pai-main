'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  ArrowRight, ArrowLeft, User, GraduationCap, MapPin, Target,
  Check, Loader2, Sparkles,
} from 'lucide-react';

const steps = [
  {
    id: 'greeting',
    title: 'Welcome to Placement AI!',
    subtitle: 'Let\'s set up your profile in just a few steps.',
    icon: Sparkles,
    component: 'greeting' as const,
  },
  {
    id: 'personal',
    title: 'Personal Information',
    subtitle: 'Tell us about yourself.',
    icon: User,
    component: 'personal' as const,
  },
  {
    id: 'education',
    title: 'Education',
    subtitle: 'Your current or most recent education.',
    icon: GraduationCap,
    component: 'education' as const,
  },
  {
    id: 'goals',
    title: 'Your Goals',
    subtitle: 'Where do you want to study?',
    icon: Target,
    component: 'goals' as const,
  },
  {
    id: 'destination',
    title: 'Preferred Destination',
    subtitle: 'Which country are you targeting?',
    icon: MapPin,
    component: 'destination' as const,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { updateProfile, profile, addEducation } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [fullName, setFullName] = useState(profile.name || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [currentEducation, setCurrentEducation] = useState(profile.current_education || '');
  const [currentStatus, setCurrentStatus] = useState(profile.current_status || '');
  const [intendedDegree, setIntendedDegree] = useState(profile.intended_degree || '');
  const [preferredField, setPreferredField] = useState(profile.preferred_field || '');
  const [intendedDestination, setIntendedDestination] = useState(profile.intended_destination || '');

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (isFirstStep) return;
    setCurrentStep((prev) => prev - 1);
    setError('');
  };

  const handleComplete = async () => {
    setLoading(true);
    setError('');

    try {
      // Update profile with all collected fields
      await updateProfile({
        name: fullName,
        phone,
        dob,
        current_education: currentEducation,
        current_status: currentStatus,
        intended_degree: intendedDegree,
        preferred_field: preferredField,
        intended_destination: intendedDestination,
      });

      // Optionally add education entry if provided
      if (currentEducation && currentEducation.trim()) {
        await addEducation({
          degree: currentStatus || 'Current Student',
          school: currentEducation,
          period: '',
          gpa: '',
        });
      }

      router.push('/chat');
    } catch (e) {
      console.error('Onboarding failed:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    if (step.component === 'greeting') {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
          }}>
            <Sparkles size={36} color="#ffffff" />
          </div>
          <p style={{ fontSize: '15px', color: '#64748b', lineHeight: 1.7, maxWidth: '380px', margin: '0 auto' }}>
            We'll help you build a strong academic profile, generate tailored application documents, and track your university admissions journey — all powered by AI.
          </p>
        </div>
      );
    }

    if (step.component === 'personal') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      );
    }

    if (step.component === 'education') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Current Education</label>
            <input
              type="text"
              placeholder="e.g. University of California"
              value={currentEducation}
              onChange={(e) => setCurrentEducation(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Current Status</label>
            <select
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Select status</option>
              <option value="Bachelor's">Bachelor's</option>
              <option value="Master's">Master's</option>
              <option value="PhD">PhD</option>
              <option value="Working Professional">Working Professional</option>
              <option value="High School">High School</option>
            </select>
          </div>
        </div>
      );
    }

    if (step.component === 'goals') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Intended Degree</label>
            <select
              value={intendedDegree}
              onChange={(e) => setIntendedDegree(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Select degree</option>
              <option value="Bachelor's">Bachelor's</option>
              <option value="Master's">Master's</option>
              <option value="MBA">MBA</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Preferred Field of Study</label>
            <input
              type="text"
              placeholder="e.g. Computer Science, Business, Engineering"
              value={preferredField}
              onChange={(e) => setPreferredField(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      );
    }

    if (step.component === 'destination') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Preferred Destination</label>
            <select
              value={intendedDestination}
              onChange={(e) => setIntendedDestination(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Select country</option>
              <option value="USA">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Singapore">Singapore</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      );
    }

    return null;
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f8fafc 100%)',
      padding: '24px',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.06)',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        {/* Step Progress Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '32px' }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentStep ? '28px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: idx <= currentStep ? '#2563eb' : '#e2e8f0',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Step Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px auto',
            color: '#2563eb',
          }}>
            {React.createElement(steps[currentStep].icon, { size: 24 })}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
            {steps[currentStep].title}
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>
            {steps[currentStep].subtitle}
          </p>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              color: '#ef4444',
              fontSize: '13px',
              fontWeight: 500,
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '8px',
              padding: '10px 14px',
              marginTop: '16px',
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '32px',
          gap: '12px',
        }}>
          <button
            onClick={handleBack}
            disabled={isFirstStep || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: isFirstStep ? '#cbd5e1' : '#64748b',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isFirstStep || loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              visibility: isFirstStep ? 'hidden' : 'visible',
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <button
            onClick={handleNext}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1,
              marginLeft: 'auto',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Saving...
              </>
            ) : isLastStep ? (
              <>
                Complete <Check size={16} />
              </>
            ) : (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}