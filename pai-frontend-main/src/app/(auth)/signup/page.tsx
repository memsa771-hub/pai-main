'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  ArrowRight, ArrowLeft, AlertCircle, ChevronDown, Check, 
  Eye, EyeOff, Sparkles, User, GraduationCap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const countryList = [
  { name: "United States", code: "US", prefix: "+1" },
  { name: "United Kingdom", code: "GB", prefix: "+44" },
  { name: "India", code: "IN", prefix: "+91" },
  { name: "Canada", code: "CA", prefix: "+1" },
  { name: "Australia", code: "AU", prefix: "+61" },
  { name: "Germany", code: "DE", prefix: "+49" },
  { name: "Pakistan", code: "PK", prefix: "+92" },
];

const STEPS = [
  { id: 1, label: 'Account', icon: User },
  { id: 2, label: 'Personal', icon: Sparkles },
  { id: 3, label: 'Academic', icon: GraduationCap },
];

function getPasswordStrength(pw: string): { level: 'weak' | 'fair' | 'good' | 'strong'; hint: string } {
  if (!pw) return { level: 'weak', hint: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 'weak', hint: 'Add numbers & uppercase letters' };
  if (score === 2) return { level: 'fair', hint: 'Try adding special characters' };
  if (score === 3) return { level: 'good', hint: 'Almost there!' };
  return { level: 'strong', hint: 'Excellent password' };
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 80 : -80, opacity: 0 }),
};

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoggedIn } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState(countryList[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [country, setCountry] = useState('');

  const [currentEducation, setCurrentEducation] = useState('');
  const [intendedDestination, setIntendedDestination] = useState('');
  const [intendedDegree, setIntendedDegree] = useState('');
  const [preferredField, setPreferredField] = useState('');

  useEffect(() => {
    if (isLoggedIn) router.push('/dashboard/chat');
  }, [isLoggedIn, router]);

  const passwordStrength = getPasswordStrength(password);
  const isStep1Valid = fullName.trim() && emailAddress.trim() && password.trim().length >= 6 && password === confirmPassword;

  const step1Error = () => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!emailAddress.trim()) return 'Please enter your email address.';
    if (password.trim().length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleNext = () => {
    if (currentStep === 1) {
      const err = step1Error();
      if (err) { setFormError(err); return; }
      setFormError('');
    }
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => { setFormError(''); setDirection(-1); setCurrentStep(prev => Math.max(prev - 1, 1)); };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const err = step1Error();
    if (err) { setFormError(err); setCurrentStep(1); return; }
    setIsSubmitting(true);
    setFormError('');
    const success = await signup({
      email: emailAddress, password, full_name: fullName,
      phone: phoneNumber ? `${selectedCountry.prefix} ${phoneNumber}` : undefined,
      gender: gender || undefined,
      country: country || undefined,
      current_education: currentEducation || undefined,
      intended_destination: intendedDestination || undefined,
      intended_degree: intendedDegree || undefined,
      preferred_field: preferredField || undefined,
    });
    setIsSubmitting(false);
    if (success) {
      setShowSuccess(true);
      setTimeout(() => router.push('/dashboard/chat'), 2800);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] px-4 py-8">
      <div className="mb-8 flex items-center gap-2">
        <img src="/logo.png" alt="PAI Logo" className="h-7 w-auto" />
        <span className="font-heading text-lg font-bold"><span className="text-primary">Placement</span> <span className="text-[#0f172a]">AI</span></span>
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">Create Your Account</p>
        <h1 className="text-2xl font-heading font-bold text-[#0f172a] mt-1">Join Placement AI</h1>
      </motion.div>

      {!showSuccess && (
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  currentStep === step.id ? 'bg-primary text-white' : currentStep > step.id ? 'bg-[#10b981] text-white' : 'bg-[#e2e8f0] text-[#94a3b8]'
                }`}>
                  {currentStep > step.id ? <Check size={14} /> : step.id}
                </div>
                <span className={`text-[10px] font-semibold mt-1 ${currentStep === step.id ? 'text-primary' : 'text-[#94a3b8]'}`}>{step.label}</span>
              </div>
              {idx < STEPS.length - 1 && <div className="w-12 h-0.5 bg-[#e2e8f0] mx-1 -mt-4"><div className="h-full bg-primary transition-all" style={{ width: currentStep > step.id ? '100%' : '0%' }} /></div>}
            </React.Fragment>
          ))}
        </div>
      )}

      <motion.div
        className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-[#e2e8f0] p-8"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      >
        {showSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-[#ecfdf5] text-[#10b981] rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={36} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-heading font-bold text-[#0f172a] mb-2">Welcome aboard, {fullName.split(' ')[0]}!</h2>
            <p className="text-sm text-[#475569]">Your account has been created successfully. Taking you to your dashboard...</p>
            <div className="h-1.5 bg-[#e2e8f0] rounded-full mt-6 overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {formError && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-2 text-[#ef4444] text-sm font-semibold bg-[#fef2f2] border border-[#fee2e2] rounded-xl p-3 mb-4">
                  <AlertCircle size={16} /> {formError}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={currentStep} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                {currentStep === 1 && (
                  <div>
                    <h2 className="text-lg font-heading font-bold text-[#0f172a] mb-1">Create your account</h2>
                    <p className="text-sm text-[#475569] mb-6">Enter your credentials to get started.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1">Full Name *</label>
                        <input type="text" className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="e.g. Alexander Sterling" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1">Email Address *</label>
                        <input type="email" className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="alex@university.edu" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#475569] mb-1">Password *</label>
                          <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} className="w-full px-4 py-3 pr-10 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="Min 6 chars" value={password} onChange={e => setPassword(e.target.value)} />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                          </div>
                          {password && (
                            <div className="mt-2">
                              <div className="h-1 bg-[#e2e8f0] rounded-full"><div className={`h-full rounded-full transition-all ${
                                passwordStrength.level === 'strong' ? 'w-full bg-[#10b981]' : passwordStrength.level === 'good' ? 'w-3/4 bg-[#3b82f6]' : passwordStrength.level === 'fair' ? 'w-1/2 bg-[#f59e0b]' : 'w-1/4 bg-[#ef4444]'
                              }`} /></div>
                              <p className="text-[11px] text-[#94a3b8] mt-1 capitalize">{passwordStrength.level} · {passwordStrength.hint}</p>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#475569] mb-1">Confirm Password *</label>
                          <input type="password" className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                          {confirmPassword && (
                            <p className={`text-[11px] mt-1 font-semibold ${password === confirmPassword ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {currentStep === 2 && (
                  <div>
                    <h2 className="text-lg font-heading font-bold text-[#0f172a] mb-1">Personal details</h2>
                    <p className="text-sm text-[#475569] mb-6">All optional — fill in later from your profile.</p>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1">
                          <label className="block text-xs font-semibold text-[#475569] mb-1">Code</label>
                          <select className="w-full px-3 py-3 border border-[#e2e8f0] rounded-xl text-sm" value={selectedCountry.code} onChange={e => { const c = countryList.find(c => c.code === e.target.value); if (c) setSelectedCountry(c); }}>
                            {countryList.map(c => <option key={c.code} value={c.code}>{c.prefix} ({c.code})</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-[#475569] mb-1">Phone Number</label>
                          <input type="tel" className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="555-0123" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1">Gender</label>
                        <select className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm" value={gender} onChange={e => setGender(e.target.value)}>
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1">Country of Residence</label>
                        <input type="text" className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="e.g. United Kingdom" value={country} onChange={e => setCountry(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
                {currentStep === 3 && (
                  <div>
                    <h2 className="text-lg font-heading font-bold text-[#0f172a] mb-1">Academic goals</h2>
                    <p className="text-sm text-[#475569] mb-6">All optional — tell us about your aspirations.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1">Current Education Level</label>
                        <select className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm" value={currentEducation} onChange={e => setCurrentEducation(e.target.value)}>
                          <option value="">Select Level</option>
                          <option value="High School">High School</option><option value="Bachelor's">Bachelor's</option><option value="Master's">Master's</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1">Intended Destination</label>
                        <input type="text" className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="e.g. United States" value={intendedDestination} onChange={e => setIntendedDestination(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1">Intended Degree</label>
                        <input type="text" className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="e.g. M.S. in Computer Science" value={intendedDegree} onChange={e => setIntendedDegree(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#475569] mb-1">Preferred Field of Study</label>
                        <input type="text" className="w-full px-4 py-3 border border-[#e2e8f0] rounded-xl text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none" placeholder="e.g. Artificial Intelligence" value={preferredField} onChange={e => setPreferredField(e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#f1f5f9]">
              <div className="flex items-center gap-2">
                {currentStep === 1 ? (
                  <span className="text-sm text-[#475569]">Already have an account? <Link href="/login" className="text-primary font-semibold hover:underline">Log In</Link></span>
                ) : (
                  <button onClick={handleBack} className="flex items-center gap-1 text-sm font-semibold text-[#475569] hover:text-[#0f172a]"><ArrowLeft size={16} /> Back</button>
                )}
                {currentStep > 1 && <button onClick={() => setCurrentStep(3)} className="text-sm text-[#94a3b8] ml-2">Skip for now</button>}
              </div>
              {currentStep < 3 ? (
                <button onClick={handleNext} disabled={currentStep === 1 && !isStep1Valid} className="flex items-center gap-2 bg-primary text-white font-heading font-semibold px-6 py-3 rounded-full hover:bg-[#002276] transition-all disabled:opacity-50">
                  {currentStep === 1 ? 'Continue' : 'Next'} <ArrowRight size={18} />
                </button>
              ) : (
                <button onClick={() => handleSubmit()} disabled={isSubmitting} className="flex items-center gap-2 bg-primary text-white font-heading font-semibold px-6 py-3 rounded-full hover:bg-[#002276] transition-all disabled:opacity-50">
                  {isSubmitting ? 'Creating account...' : <>Create Account <Sparkles size={18} /></>}
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}