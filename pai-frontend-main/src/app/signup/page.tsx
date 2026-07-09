'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  ArrowRight, ArrowLeft, AlertCircle, ChevronDown, Check, 
  Eye, EyeOff, Sparkles, User, GraduationCap, SkipForward
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import './signup.css';

interface CountryDial {
  name: string;
  code: string;
  prefix: string;
}

const countryList: CountryDial[] = [
  { name: "United States", code: "US", prefix: "+1" },
  { name: "United Kingdom", code: "GB", prefix: "+44" },
  { name: "India", code: "IN", prefix: "+91" },
  { name: "Canada", code: "CA", prefix: "+1" },
  { name: "Australia", code: "AU", prefix: "+61" },
  { name: "Germany", code: "DE", prefix: "+49" },
  { name: "France", code: "FR", prefix: "+33" },
  { name: "United Arab Emirates", code: "AE", prefix: "+971" },
  { name: "Saudi Arabia", code: "SA", prefix: "+966" },
  { name: "Singapore", code: "SG", prefix: "+65" },
  { name: "Pakistan", code: "PK", prefix: "+92" },
  { name: "China", code: "CN", prefix: "+86" },
  { name: "Brazil", code: "BR", prefix: "+55" },
  { name: "Japan", code: "JP", prefix: "+81" },
  { name: "South Korea", code: "KR", prefix: "+82" },
  { name: "South Africa", code: "ZA", prefix: "+27" },
  { name: "Nigeria", code: "NG", prefix: "+234" },
  { name: "Turkey", code: "TR", prefix: "+90" },
  { name: "Spain", code: "ES", prefix: "+34" },
  { name: "Italy", code: "IT", prefix: "+39" },
  { name: "Netherlands", code: "NL", prefix: "+31" },
  { name: "Switzerland", code: "CH", prefix: "+41" },
  { name: "Sweden", code: "SE", prefix: "+46" },
  { name: "Malaysia", code: "MY", prefix: "+60" },
  { name: "Mexico", code: "MX", prefix: "+52" }
];

const nationalityList = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Argentine", "Armenian", "Australian", "Austrian",
  "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese",
  "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian", "Cambodian",
  "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese", "Colombian", "Comoran", "Congolese",
  "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Dutch", "East Timorese",
  "Ecuadorian", "Egyptian", "Emirati", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian", "Filipino", "Finnish",
  "French", "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan", "Guinean",
  "Guyanese", "Haitian", "Honduran", "Hungarian", "Icelandic", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish",
  "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakh", "Kenyan", "Kuwaiti", "Kyrgyz",
  "Lao", "Latvian", "Lebanese", "Liberian", "Libyan", "Liechtensteiner", "Lithuanian", "Luxembourger", "Macedonian", "Malagasy",
  "Malawian", "Malaysian", "Maldivian", "Malian", "Maltese", "Mauritanian", "Mauritian", "Mexican", "Micronesian", "Moldovan",
  "Monacan", "Mongolian", "Montenegrin", "Moroccan", "Mozambican", "Namibian", "Nepalese", "New Zealander", "Nicaraguan", "Nigerien",
  "Nigerian", "North Korean", "Norwegian", "Omani", "Pakistani", "Palauan", "Panamanian", "Papua New Guinean", "Paraguayan", "Peruvian",
  "Polish", "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan", "Saint Lucian", "Salvadoran", "Samoan", "San Marinese",
  "Saudi", "Senegalese", "Serbian", "Seychellois", "Sierra Leonean", "Singaporean", "Slovak", "Slovenian", "Solomon Islander", "Somali",
  "South African", "South Korean", "Spanish", "Sri Lankan", "Sudanese", "Surinamese", "Swazi", "Swedish", "Swiss", "Syrian",
  "Taiwanese", "Tajik", "Tanzanian", "Thai", "Togolese", "Tongan", "Trinidadian", "Tunisian", "Turkish", "Turkmen",
  "Tuvaluan", "Ugandan", "Ukrainian", "Uruguayan", "Uzbek", "Venezuelan", "Vietnamese", "Yemeni", "Zambian", "Zimbabwean"
];

// Step definitions
const STEPS = [
  { id: 1, label: 'Account', icon: User },
  { id: 2, label: 'Personal', icon: Sparkles },
  { id: 3, label: 'Academic', icon: GraduationCap },
];

// Password strength calculator
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

// Slide animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useApp();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Account credentials
  const [fullName, setFullName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Step 2: Personal info
  const [selectedCountry, setSelectedCountry] = useState<CountryDial>(countryList[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [linkedin, setLinkedin] = useState('');

  // Step 3: Academic goals
  const [currentEducation, setCurrentEducation] = useState('');
  const [currentStatus, setCurrentStatus] = useState('');
  const [intendedDestination, setIntendedDestination] = useState('');
  const [intendedDegree, setIntendedDegree] = useState('');
  const [preferredField, setPreferredField] = useState('');

  // Searchable Country Dropdown Popover States
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Searchable Nationality Dropdown Popover States
  const [isNatPopoverOpen, setIsNatPopoverOpen] = useState(false);
  const [natSearch, setNatSearch] = useState('');
  const natPopoverRef = useRef<HTMLDivElement>(null);

  // Click outside to close popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
      if (natPopoverRef.current && !natPopoverRef.current.contains(event.target as Node)) {
        setIsNatPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Password strength
  const passwordStrength = getPasswordStrength(password);

  // Step 1 validation
  const isStep1Valid =
    fullName.trim() !== '' &&
    emailAddress.trim() !== '' &&
    password.trim().length >= 6 &&
    confirmPassword.trim() !== '' &&
    password === confirmPassword;

  const step1Error = () => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!emailAddress.trim()) return 'Please enter your email address.';
    if (password.trim().length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  // Navigate forward
  const handleNext = () => {
    if (currentStep === 1) {
      const err = step1Error();
      if (err) {
        setFormError(err);
        return;
      }
      setFormError('');
    }
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  // Navigate backward
  const handleBack = () => {
    setFormError('');
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Skip current optional step
  const handleSkip = () => {
    if (currentStep === 2) {
      setDirection(1);
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleSubmit();
    }
  };

  // Final submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Re-validate step 1
    const err = step1Error();
    if (err) {
      setFormError(err);
      setDirection(-1);
      setCurrentStep(1);
      return;
    }
    
    setIsSubmitting(true);
    setFormError('');

    const success = await signup({
      email: emailAddress,
      password: password,
      full_name: fullName,
      phone: phoneNumber ? `${selectedCountry.prefix} ${phoneNumber}` : undefined,
      dob: dob || undefined,
      gender: gender || undefined,
      nationality: nationality || undefined,
      country: country || undefined,
      city: city || undefined,
      linkedin: linkedin || undefined,
      current_education: currentEducation || undefined,
      current_status: currentStatus || undefined,
      intended_destination: intendedDestination || undefined,
      intended_degree: intendedDegree || undefined,
      preferred_field: preferredField || undefined,
    });

    setIsSubmitting(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/chat');
      }, 2800);
    }
  };

  // Filter countries
  const filteredCountries = countryList.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.prefix.includes(countrySearch) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Filter nationalities
  const filteredNationalities = nationalityList.filter(n =>
    n.toLowerCase().includes(natSearch.toLowerCase())
  );

  // Confetti colors
  const confettiColors = ['#002d9c', '#4f46e5', '#10b981', '#f59e0b', '#60a5fa', '#34d399', '#a78bfa'];

  return (
    <div className="signup-container">
      <div className="signup-bg-glow" />
      <div className="signup-bg-glow-left" />

      {/* Header */}
      <motion.div
        className="signup-header-wrap"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <span className="signup-pretitle">Create Your Account</span>
        <h1 className="signup-title">Join Placement AI</h1>
        <p className="signup-subtitle">
          Set up your account in just a few steps. Optional details can be added anytime.
        </p>
      </motion.div>

      {/* Step Progress Bar */}
      {!showSuccess && (
        <motion.div
          className="step-progress-bar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {STEPS.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="step-indicator">
                <div
                  className={`step-circle ${
                    currentStep === step.id ? 'active' : currentStep > step.id ? 'completed' : ''
                  }`}
                >
                  {currentStep > step.id ? <Check size={18} /> : step.id}
                </div>
                <span
                  className={`step-label ${
                    currentStep === step.id ? 'active' : currentStep > step.id ? 'completed' : ''
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="step-connector">
                  <div
                    className="step-connector-fill"
                    style={{ width: currentStep > step.id ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </motion.div>
      )}

      {/* Main Wizard Card */}
      <motion.div
        className="signup-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
      >
        {/* Success State */}
        {showSuccess ? (
          <motion.div
            className="signup-success-wrap"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Confetti */}
            <div className="confetti-container">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 20 - 10}%`,
                    backgroundColor: confettiColors[i % confettiColors.length],
                    animationDelay: `${Math.random() * 0.8}s`,
                    animationDuration: `${2 + Math.random() * 1.5}s`,
                    width: `${6 + Math.random() * 6}px`,
                    height: `${6 + Math.random() * 6}px`,
                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                  }}
                />
              ))}
            </div>
            
            <motion.div
              className="success-icon-circle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
            >
              <Check size={40} strokeWidth={3} />
            </motion.div>
            <h2 className="success-title">Welcome aboard, {fullName.split(' ')[0]}! 🎉</h2>
            <p className="success-subtitle">
              Your account has been created successfully. Taking you to your dashboard now...
            </p>
            <div className="success-redirect-bar">
              <div className="success-redirect-fill" />
            </div>
          </motion.div>
        ) : (
          <>
            {/* Error Alert */}
            <AnimatePresence mode="wait">
              {formError && (
                <motion.div
                  className="signup-error-alert"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  key="error"
                >
                  <AlertCircle size={18} />
                  {formError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Animated Step Content */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {/* =============== STEP 1: Account Credentials =============== */}
                {currentStep === 1 && (
                  <div>
                    <div className="step-card-header">
                      <h2 className="step-card-title">Create your account</h2>
                      <p className="step-card-desc">Enter your credentials to get started with Placement AI.</p>
                    </div>

                    <div className="signup-form-grid">
                      {/* Full Name */}
                      <div className="form-group-full">
                        <label className="form-label" htmlFor="signup-fullname">Full Name *</label>
                        <input
                          type="text"
                          id="signup-fullname"
                          className="signup-input-fill"
                          placeholder="e.g. Alexander Sterling"
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          autoFocus
                        />
                      </div>

                      {/* Email */}
                      <div className="form-group-full">
                        <label className="form-label" htmlFor="signup-email">Email Address *</label>
                        <input
                          type="email"
                          id="signup-email"
                          className="signup-input-fill"
                          placeholder="alex.sterling@university.edu"
                          value={emailAddress}
                          onChange={e => setEmailAddress(e.target.value)}
                        />
                      </div>

                      {/* Password */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-password">Password *</label>
                        <div className="password-input-wrap">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            id="signup-password"
                            className="signup-input-fill"
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ paddingRight: '44px' }}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {/* Password Strength Meter */}
                        {password && (
                          <div className="password-strength-wrap">
                            <div className="password-strength-bar-track">
                              <div className={`password-strength-bar-fill ${passwordStrength.level}`} />
                            </div>
                            <div className="password-strength-label">
                              <span className={`strength-text ${passwordStrength.level}`}>
                                {passwordStrength.level}
                              </span>
                              <span className="strength-hint">{passwordStrength.hint}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-confirm-password">Confirm Password *</label>
                        <div className="password-input-wrap">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="signup-confirm-password"
                            className="signup-input-fill"
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            style={{ paddingRight: '44px' }}
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                          <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px', fontWeight: 600 }}>
                            Passwords do not match
                          </span>
                        )}
                        {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                          <span style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={14} /> Passwords match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* =============== STEP 2: Personal Details =============== */}
                {currentStep === 2 && (
                  <div>
                    <div className="step-card-header">
                      <h2 className="step-card-title">Personal details</h2>
                      <p className="step-card-desc">Help us personalize your experience. All fields are optional — you can fill these in later from your profile.</p>
                    </div>

                    <div className="signup-form-grid">
                      {/* Phone Number */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-phone">Phone Number</label>
                        <div className="phone-input-wrap">
                          <div className="country-select-popover-wrap" ref={popoverRef}>
                            <button
                              type="button"
                              className="country-select-trigger"
                              onClick={() => {
                                setIsPopoverOpen(!isPopoverOpen);
                                setCountrySearch('');
                              }}
                            >
                              <span>{selectedCountry.code} ({selectedCountry.prefix})</span>
                              <ChevronDown size={14} style={{ opacity: 0.7 }} />
                            </button>

                            <AnimatePresence>
                              {isPopoverOpen && (
                                <motion.div
                                  className="country-popover-list"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  <input
                                    type="text"
                                    className="country-popover-search"
                                    placeholder="Search country/code..."
                                    value={countrySearch}
                                    onChange={e => setCountrySearch(e.target.value)}
                                    autoFocus
                                  />
                                  <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {filteredCountries.length > 0 ? (
                                      filteredCountries.map((c) => (
                                        <button
                                          key={c.code}
                                          type="button"
                                          className="country-popover-item"
                                          onClick={() => {
                                            setSelectedCountry(c);
                                            setIsPopoverOpen(false);
                                          }}
                                        >
                                          <span className="country-popover-item-name">{c.name}</span>
                                          <span className="country-popover-item-prefix">{c.prefix}</span>
                                        </button>
                                      ))
                                    ) : (
                                      <div style={{ padding: '12px', fontSize: '13px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No countries found
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <input
                            type="tel"
                            id="signup-phone"
                            className="signup-input-fill"
                            placeholder="555-0123"
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-dob">Date of Birth</label>
                        <input
                          type="date"
                          id="signup-dob"
                          className="signup-input-fill"
                          value={dob}
                          onChange={e => setDob(e.target.value)}
                        />
                      </div>

                      {/* Gender */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-gender">Gender</label>
                        <select
                          id="signup-gender"
                          className="signup-input-fill"
                          value={gender}
                          onChange={e => setGender(e.target.value)}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>

                      {/* Nationality */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-nationality">Nationality</label>
                        <div className="country-select-popover-wrap" ref={natPopoverRef}>
                          <button
                            type="button"
                            className="country-select-trigger"
                            style={{ width: '100%' }}
                            onClick={() => {
                              setIsNatPopoverOpen(!isNatPopoverOpen);
                              setNatSearch('');
                            }}
                          >
                            <span>{nationality || "Select Nationality"}</span>
                            <ChevronDown size={14} style={{ opacity: 0.7 }} />
                          </button>

                          <AnimatePresence>
                            {isNatPopoverOpen && (
                              <motion.div
                                className="country-popover-list"
                                style={{ width: '100%', minWidth: '240px' }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.15 }}
                              >
                                <input
                                  type="text"
                                  className="country-popover-search"
                                  placeholder="Search nationality..."
                                  value={natSearch}
                                  onChange={e => setNatSearch(e.target.value)}
                                  autoFocus
                                />
                                <div style={{ flex: 1, overflowY: 'auto', maxHeight: '180px' }}>
                                  {filteredNationalities.length > 0 ? (
                                    filteredNationalities.map((n) => (
                                      <button
                                        key={n}
                                        type="button"
                                        className="country-popover-item"
                                        onClick={() => {
                                          setNationality(n);
                                          setIsNatPopoverOpen(false);
                                        }}
                                      >
                                        <span>{n}</span>
                                      </button>
                                    ))
                                  ) : (
                                    <div style={{ padding: '12px', fontSize: '13px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                      No options found
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* Country */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-country">Country of Residence</label>
                        <input
                          type="text"
                          id="signup-country"
                          className="signup-input-fill"
                          placeholder="United Kingdom"
                          value={country}
                          onChange={e => setCountry(e.target.value)}
                        />
                      </div>

                      {/* City */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-city">Current City</label>
                        <input
                          type="text"
                          id="signup-city"
                          className="signup-input-fill"
                          placeholder="London"
                          value={city}
                          onChange={e => setCity(e.target.value)}
                        />
                      </div>

                      {/* LinkedIn */}
                      <div className="form-group-full">
                        <label className="form-label" htmlFor="signup-linkedin">LinkedIn Profile URL</label>
                        <input
                          type="url"
                          id="signup-linkedin"
                          className="signup-input-fill"
                          placeholder="https://linkedin.com/in/alexsterling"
                          value={linkedin}
                          onChange={e => setLinkedin(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* =============== STEP 3: Academic Goals =============== */}
                {currentStep === 3 && (
                  <div>
                    <div className="step-card-header">
                      <h2 className="step-card-title">Academic goals</h2>
                      <p className="step-card-desc">Tell us about your academic aspirations so we can tailor your experience. All fields are optional.</p>
                    </div>

                    <div className="signup-form-grid">
                      {/* Current Education Level */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-education">Current Education Level</label>
                        <select
                          id="signup-education"
                          className="signup-input-fill"
                          value={currentEducation}
                          onChange={e => setCurrentEducation(e.target.value)}
                        >
                          <option value="">Select Level</option>
                          <option value="High School">High School / Secondary</option>
                          <option value="Bachelor's">Bachelor&apos;s Degree</option>
                          <option value="Master's">Master&apos;s Degree</option>
                          <option value="PhD">PhD / Doctorate</option>
                        </select>
                      </div>

                      {/* Current Status */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-status">Current Status</label>
                        <select
                          id="signup-status"
                          className="signup-input-fill"
                          value={currentStatus}
                          onChange={e => setCurrentStatus(e.target.value)}
                        >
                          <option value="">Select Status</option>
                          <option value="Student">Student</option>
                          <option value="Working Professional">Working Professional</option>
                          <option value="Graduate">Graduate</option>
                          <option value="Gap Year">Gap Year</option>
                        </select>
                      </div>

                      {/* Intended Destination */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-destination">Intended Destination</label>
                        <input
                          type="text"
                          id="signup-destination"
                          className="signup-input-fill"
                          placeholder="e.g. United States"
                          value={intendedDestination}
                          onChange={e => setIntendedDestination(e.target.value)}
                        />
                      </div>

                      {/* Intended Degree */}
                      <div className="form-group">
                        <label className="form-label" htmlFor="signup-degree">Intended Degree</label>
                        <input
                          type="text"
                          id="signup-degree"
                          className="signup-input-fill"
                          placeholder="e.g. M.S. in Computer Science"
                          value={intendedDegree}
                          onChange={e => setIntendedDegree(e.target.value)}
                        />
                      </div>

                      {/* Preferred Field */}
                      <div className="form-group-full">
                        <label className="form-label" htmlFor="signup-field">Preferred Field of Study</label>
                        <input
                          type="text"
                          id="signup-field"
                          className="signup-input-fill"
                          placeholder="e.g. Artificial Intelligence"
                          value={preferredField}
                          onChange={e => setPreferredField(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Wizard Footer */}
            <div className="signup-footer">
              <div className="signup-footer-left">
                {currentStep === 1 ? (
                  <span className="signup-login-link">
                    Already have an account? <Link href="/#login">Log In</Link>
                  </span>
                ) : (
                  <button type="button" className="signup-back-btn" onClick={handleBack}>
                    <ArrowLeft size={16} /> Back
                  </button>
                )}
                {currentStep > 1 && (
                  <button type="button" className="signup-skip-btn" onClick={handleSkip}>
                    Skip for now
                  </button>
                )}
              </div>

              {currentStep < 3 ? (
                <button
                  type="button"
                  className="btn btn-primary signup-next-btn"
                  onClick={handleNext}
                  disabled={currentStep === 1 && !isStep1Valid}
                >
                  {currentStep === 1 ? 'Continue' : 'Next'} <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary signup-next-btn"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="animate-pulse-soft">Creating account...</span>
                  ) : (
                    <>Create Account <Sparkles size={18} /></>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
