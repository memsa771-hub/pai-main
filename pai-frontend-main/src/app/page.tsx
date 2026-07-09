'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, Lock, Mail, ArrowRight, ArrowDown, ChevronLeft, ChevronRight, 
  Sparkles, FileText, CheckSquare, AlertTriangle, Lightbulb, Compass, Trash2,
  Eye, EyeOff, Loader2
} from 'lucide-react';
import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn, login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'credentials' | 'google' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Carousel States
  const [currentSlide, setCurrentSlide] = useState(0);
 const benefits = [
  {
    title: "Build Your Academic Profile",
    desc: "Start by simply talking with PAI. It learns about your academic background, achievements, goals, and preferences to create a comprehensive student profile that powers every application.",
    icon: Sparkles
  },
  {
    title: "University-Specific SOPs & LORs",
    desc: "PAI automatically generates tailored Statements of Purpose and Letters of Recommendation for each university as you build your profile—no need to write every document from scratch.",
    icon: FileText
  },
  {
    title: "Personalized Admission Guidance",
    desc: "Receive intelligent recommendations on universities, scholarships, deadlines, and application strategies based on your profile, strengths, and career aspirations.",
    icon: Lightbulb
  },
  {
    title: "Your Complete Academic Platform",
    desc: "Track applications, manage documents, monitor deadlines, receive AI-powered insights, and stay organized from your first application to your final admission offer—all in one place.",
    icon: CheckSquare
  }
];
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/dashboard/chat');
    }
  }, [isLoggedIn, router]);

  // Auto advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % benefits.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [benefits.length]);

  const handlePrevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + benefits.length) % benefits.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % benefits.length);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    setLoginMethod('credentials');
    
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      router.push('/dashboard/chat');
    } else {
      setError('Invalid email or password.');
    }
  };

  const handleGoogleLogin = () => {
    setError('Google sign-in is not available yet. Please use your email and password.');
    setLoginMethod(null);
    setLoading(false);
  };

  const scrollToLogin = () => {
    const el = document.getElementById('login');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const ActiveIcon = benefits[currentSlide].icon;

  return (
    <div className="landing-container">
      {/* Floating Pill Navigation */}
      <div className="landing-header-wrap">
        <header className="landing-header">
          <div className="landing-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="Placement AI Logo" style={{ height: '22px', width: 'auto', objectFit: 'contain' }} />
            <div className="landing-logo-text" style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-heading)' }}>
              <span style={{ color: 'var(--primary)' }}>Placement</span> <span style={{ color: '#0f172a' }}>AI</span>
            </div>
          </div>
          <nav className="landing-nav">
            <Link href="#features" className="landing-nav-link">AI</Link>
            <Link href="#features" className="landing-nav-link">Tracker</Link>
            <Link href="#steps" className="landing-nav-link">Roadmap</Link>
          </nav>
          <button onClick={scrollToLogin} className="landing-login-btn">
            Login
          </button>
        </header>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <motion.h1 
          className="hero-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Your AI companion to easy admissions to your desired university
        </motion.h1>
        <motion.p 
          className="hero-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          An all-in-one admissions platform
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <button onClick={scrollToLogin} className="btn btn-primary" style={{ padding: '14px 32px' }}>
            Get Started Free <ArrowRight size={16} />
          </button>

          <button onClick={scrollToFeatures} className="caret-down-anim" style={{ marginTop: '50px' }} aria-label="Scroll down">
            <ArrowDown size={28} />
          </button>
        </motion.div>
      </section>

      {/* Benefits Carousel Section (Before Strategic Integration) */}
      <section className="benefits-section">
        <div style={{ maxWidth: '1100px', margin: '0 auto 40px auto', textAlign: 'center' }}>
          <span className="showcase-tag" style={{ marginBottom: '12px' }}>Platform Value</span>
          <h2 style={{ fontSize: '38px', fontWeight: 800, color: '#0f172a' }}>
            Benefits of using <span style={{ color: 'var(--primary)' }}>Placement AI</span>
          </h2>
        </div>

        <div className="benefits-container">
          {/* Left: Mascot Character Animation */}
          <div className="benefits-char-wrap">
            <div className="benefits-char-glow" />
            <div className="benefits-char-body">
              <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g>
                  {/* Glowing Orbit Rings */}
                  <circle cx="100" cy="100" r="80" stroke="rgba(0, 45, 156, 0.25)" strokeWidth="1.5">
                    <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="10s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="100" cy="100" r="70" stroke="rgba(79, 70, 229, 0.15)" strokeWidth="1" strokeDasharray="10 10">
                    <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="8s" repeatCount="indefinite" />
                  </circle>

                  {/* Mascot Base Shadow */}
                  <ellipse cx="100" cy="170" rx="30" ry="5" fill="rgba(15, 23, 42, 0.12)" />

                  {/* Helmet Head */}
                  <rect x="70" y="55" width="60" height="60" rx="30" fill="white" stroke="url(#paint_linear_car)" strokeWidth="3.5" />
                  <rect x="76" y="63" width="48" height="36" rx="18" fill="#1e293b" />

                  {/* Glowing Digital Eyes */}
                  <ellipse cx="90" cy="80" rx="5" ry="5" fill="#60a5fa">
                    <animate attributeName="ry" values="5;5;0.5;5;5" dur="3.5s" repeatCount="indefinite" />
                  </ellipse>
                  <ellipse cx="110" cy="80" rx="5" ry="5" fill="#60a5fa">
                    <animate attributeName="ry" values="5;5;0.5;5;5" dur="3.5s" repeatCount="indefinite" />
                  </ellipse>

                  {/* Mascot Antenna */}
                  <line x1="100" y1="55" x2="100" y2="40" stroke="url(#paint_linear_car)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="100" cy="40" r="3" fill="var(--secondary)" />

                  {/* Levitating Floating Hands pointing to slides */}
                  <circle cx="50" cy="105" r="6" fill="white" stroke="var(--primary)" strokeWidth="1.5">
                    <animate attributeName="transform" type="translate" values="0 0; 0 -4; 0 0" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  <g>
                    <line x1="144" y1="100" x2="152" y2="92" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                    <line x1="144" y1="100" x2="152" y2="108" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
                    <animateTransform attributeName="transform" type="translate" values="0 0; 4 0; 0 0" dur="1.5s" repeatCount="indefinite" />
                  </g>
                </g>

                <defs>
                  <linearGradient id="paint_linear_car" x1="70" y1="55" x2="130" y2="115" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--primary)" />
                    <stop offset="1" stopColor="var(--secondary)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Right: Floating Slide Cards */}
          <div className="carousel-slider">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                className="benefit-slide-card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
              >
                <div className="benefit-slide-header">
                  <div className="benefit-icon-badge">
                    <ActiveIcon size={24} />
                  </div>
                  <h3 className="benefit-title">{benefits[currentSlide].title}</h3>
                </div>
                <p className="benefit-desc">{benefits[currentSlide].desc}</p>
              </motion.div>
            </AnimatePresence>

            {/* Slider Navigation Controls */}
            <div className="carousel-controls">
              <button onClick={handlePrevSlide} className="carousel-nav-btn" aria-label="Previous slide">
                <ChevronLeft size={18} />
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {benefits.map((_, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`carousel-dot ${currentSlide === idx ? 'active' : ''}`}
                  />
                ))}
              </div>

              <button onClick={handleNextSlide} className="carousel-nav-btn" aria-label="Next slide">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Integration Section (Three Steps + Animated Character Mascot) */}
      <section className="steps-section" id="steps">
        <div className="steps-container">
          
          {/* Left Column: Three Steps */}
          <div className="steps-list">
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.2 }}>
                Strategic Integration in<br />
                <span style={{ color: 'var(--primary)' }}>Three Steps</span>
              </h2>
            </div>

            {[
              {
                num: 1,
                title: "Onboarding & Profiling",
                desc: "Provide your basic profile info and university goals to generate your initial admissions footprint."
              },
              {
                num: 2,
                title: "Roadmap Generation",
                desc: "Receive a personalized step-by-step roadmap outlining exams, recommendations, and timeline goals."
              },
              {
                num: 3,
                title: "Active Optimization",
                desc: "Refine and optimize your materials (SOPs, LORs) dynamically using our customized AI feedback models."
              }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                className="step-row"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.6 }}
              >
                <div className="step-num-circle">{step.num}</div>
                <div className="step-info">
                  <h3 className="step-info-title">{step.title}</h3>
                  <p className="step-info-desc">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Column: Animated AI Mascot Character */}
          <div className="character-wrap">
            <div className="character-glow" />
            <div className="character-body">
              {/* Custom High-Quality SVG Animated Robot Assistant */}
              <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Float helper body */}
                <g>
                  {/* Floating particles orbits */}
                  <circle cx="100" cy="100" r="85" stroke="rgba(0, 45, 156, 0.2)" strokeWidth="1" strokeDasharray="5 5">
                    <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="15s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="100" cy="100" r="75" stroke="rgba(79, 70, 229, 0.15)" strokeWidth="1.5" strokeDasharray="20 40">
                    <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="12s" repeatCount="indefinite" />
                  </circle>

                  {/* Robot Core Ring */}
                  <circle cx="100" cy="100" r="60" stroke="url(#paint0_linear)" strokeWidth="3" opacity="0.8" />

                  {/* Robot Hovering Base Shadow */}
                  <ellipse cx="100" cy="175" rx="35" ry="6" fill="rgba(15, 23, 42, 0.15)" />

                  {/* Floating Robot Body - Head */}
                  <g filter="url(#dropShadow)">
                    {/* Upper Ears / Antenna */}
                    <path d="M70 60 L60 45" stroke="url(#paint0_linear)" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="60" cy="45" r="4" fill="var(--secondary)" />
                    <path d="M130 60 L140 45" stroke="url(#paint0_linear)" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="140" cy="45" r="4" fill="var(--secondary)" />

                    {/* Head Core */}
                    <rect x="65" y="55" width="70" height="70" rx="35" fill="white" stroke="url(#paint0_linear)" strokeWidth="4" />
                    
                    {/* Glowing Digital Screen face */}
                    <rect x="73" y="65" width="54" height="42" rx="21" fill="#0f172a" />

                    {/* Blinking Eyes (SVG animation) */}
                    <ellipse cx="88" cy="86" rx="6" ry="6" fill="#60a5fa">
                      <animate attributeName="ry" values="6;6;0.5;6;6" dur="4s" repeatCount="indefinite" />
                      <animate attributeName="rx" values="6;6;6;6;6" dur="4s" repeatCount="indefinite" />
                    </ellipse>
                    <ellipse cx="112" cy="86" rx="6" ry="6" fill="#60a5fa">
                      <animate attributeName="ry" values="6;6;0.5;6;6" dur="4s" repeatCount="indefinite" />
                      <animate attributeName="rx" values="6;6;6;6;6" dur="4s" repeatCount="indefinite" />
                    </ellipse>

                    {/* Smiling mouth vector */}
                    <path d="M94 98 Q100 102 106 98" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Floating Hands/Orbs */}
                  <circle cx="45" cy="115" r="8" fill="white" stroke="var(--primary)" strokeWidth="2">
                    <animate attributeName="transform" type="translate" values="0 0; 0 -6; 0 0" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="155" cy="115" r="8" fill="white" stroke="var(--primary)" strokeWidth="2">
                    <animate attributeName="transform" type="translate" values="0 0; 0 -6; 0 0" dur="3.2s" repeatCount="indefinite" />
                  </circle>
                </g>

                {/* Definitions */}
                <defs>
                  <linearGradient id="paint0_linear" x1="60" y1="45" x2="140" y2="175" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--primary)" />
                    <stop offset="1" stopColor="var(--secondary)" />
                  </linearGradient>
                  <filter id="dropShadow" x="40" y="30" width="120" height="120" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.1" />
                  </filter>
                </defs>
              </svg>
            </div>
          </div>

        </div>
      </section>

      {/* Feature Showcase */}
      <section className="showcase-section" id="features">
        
        {/* Showcase 1: Personalized Roadmap */}
        <div className="showcase-row">
          <div className="showcase-content">
            <span className="showcase-tag">Strategic Tracks</span>
            <h3 className="showcase-title">Personalized Roadmap</h3>
            <p className="showcase-desc">
              Get dynamic milestones and checklist items for your application. Tailor your preparation tracks and unlock strategic application paths.
            </p>
            <ul className="showcase-bullets">
              <li className="showcase-bullet">Milestone-based progress tracking</li>
              <li className="showcase-bullet">Strategic preparation guidance</li>
              <li className="showcase-bullet">Dynamic locking/unlocking flow</li>
            </ul>
          </div>
          <div className="showcase-visual">
            <div className="mock-roadmap">
              <div className="mock-roadmap-bar" />
              <div className="mock-roadmap-box" style={{ marginBottom: '16px' }}>
                Stanford University track
              </div>
              <div className="mock-roadmap-steps">
                <div className="mock-roadmap-step active">1. Preparation</div>
                <div className="mock-roadmap-step">2. Application</div>
                <div className="mock-roadmap-step">3. Decision</div>
              </div>
            </div>
          </div>
        </div>

        {/* Showcase 2: University Tracker */}
        <div className="showcase-row" style={{ gridTemplateColumns: '1fr' }}>
          <div className="tracker-glow-container">
            {/* Glowing Blue Background */}
            <div className="tracker-blue-glow" />

            {/* Header section matching the user's design */}
            <div className="tracker-header-wrap">
              <div className="tracker-header-left">
                <span className="tracker-mini-tag">
                  <Sparkles size={12} /> Intelligent Monitoring
                </span>
                <h3 className="tracker-main-title">University Tracker</h3>
                <p className="tracker-main-subtitle">
                  Real-time status and probability tracking for your target institutions.
                </p>
              </div>
              <div className="tracker-sort-wrap">
                <span>Sort by:</span>
                <div className="tracker-sort-select">
                  Closest Deadline <ArrowDown size={14} style={{ opacity: 0.7 }} />
                </div>
              </div>
            </div>

            {/* The horizontal rows list */}
            <div className="tracker-rows-list">
              {[
                { 
                  uni: 'MIT', 
                  loc: 'Cambridge, Massachusetts', 
                  initial: 'M', 
                  avatarBgClass: 'blue-bg',
                  status: 'SOP Drafting', 
                  statusClass: 'sop-drafting', 
                  gpa: '3.90', 
                  match: '98%', 
                  deadline: 'Dec 15' 
                },
                { 
                  uni: 'Stanford University', 
                  loc: 'Stanford, California', 
                  initial: 'S', 
                  avatarBgClass: 'blue-bg',
                  status: 'In Progress', 
                  statusClass: 'in-progress', 
                  gpa: '3.85', 
                  match: '95%', 
                  deadline: 'Dec 15' 
                },
                { 
                  uni: 'London Business School', 
                  loc: 'London, United Kingdom', 
                  initial: 'L', 
                  avatarBgClass: 'green-bg',
                  status: 'Not Started', 
                  statusClass: 'not-started', 
                  gpa: '3.75', 
                  match: '87%', 
                  deadline: 'Jan 08' 
                }
              ].map((item, idx) => (
                <motion.div 
                  key={idx} 
                  className="tracker-row-card"
                  initial={{ opacity: 0, scale: 0.85, y: 30 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.2 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    delay: idx * 0.15 
                  }}
                >
                  {/* Col 1: Uni Info */}
                  <div className="tracker-row-uni-info">
                    <div className={`tracker-uni-avatar ${item.avatarBgClass}`}>
                      {item.initial}
                    </div>
                    <div className="tracker-uni-details">
                      <h4 className="tracker-uni-name-text">{item.uni}</h4>
                      <span className="tracker-uni-loc-text">{item.loc}</span>
                    </div>
                  </div>

                  {/* Col 2: Status */}
                  <div className="tracker-row-col">
                    <span className="tracker-col-label">Status</span>
                    <span className={`tracker-status-badge ${item.statusClass}`}>{item.status}</span>
                  </div>

                  {/* Col 3: GPA */}
                  <div className="tracker-row-col">
                    <span className="tracker-col-label">GPA</span>
                    <span className="tracker-col-value">{item.gpa}</span>
                  </div>

                  {/* Col 4: Match Chance */}
                  <div className="tracker-row-col">
                    <span className="tracker-col-label">Match</span>
                    <span className="tracker-match-badge">
                      <span className="tracker-match-dot" /> {item.match}
                    </span>
                  </div>

                  {/* Col 5: Deadline */}
                  <div className="tracker-row-col">
                    <span className="tracker-col-label">Deadline</span>
                    <span className="tracker-col-value deadline">{item.deadline}</span>
                  </div>

                  {/* Col 6: Actions */}
                  <div className="tracker-row-actions">
                    <button type="button" className="tracker-action-btn compass" aria-label="Explore target">
                      <Compass size={16} />
                    </button>
                    <button type="button" className="tracker-action-btn delete" aria-label="Remove target">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Showcase 3: Automated Document Engine */}
        <div className="showcase-row">
          <div className="showcase-content">
            <span className="showcase-tag">AI Optimization</span>
            <h3 className="showcase-title">Automated Document Engine</h3>
            <p className="showcase-desc">
              Upload your Statement of Purpose (SOP) or Letter of Recommendation (LOR) drafts. Get instant readability, grammar, and alignment checks with university standards.
            </p>
            <ul className="showcase-bullets">
              <li className="showcase-bullet">Consolidate SOPs and LORs in minutes</li>
              <li className="showcase-bullet">Review drafts against university-specific trends</li>
              <li className="showcase-bullet">Interactive scan scores for immediate improvements</li>
            </ul>
          </div>
          <div className="showcase-visual" style={{ background: 'linear-gradient(135deg, #e0e7ff 0%, #e0f2fe 100%)', border: 'none' }}>
            <div className="mock-doc">
              <div className="mock-doc-header">
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>SOP_Stanford_v2.txt</span>
                <span className="badge badge-success" style={{ fontSize: '10px' }}>AI OPTIMIZED</span>
              </div>
              <div className="mock-doc-body">
                <div className="mock-doc-line" style={{ width: '100%' }} />
                <div className="mock-doc-line" style={{ width: '90%', background: 'rgba(0, 45, 156, 0.15)' }} />
                <div className="mock-doc-line" style={{ width: '95%' }} />
                <div className="mock-doc-line" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Showcase 4: Intelligent Gap Analysis */}
        <div className="showcase-row" style={{ gridTemplateColumns: '1fr' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', marginBottom: '24px' }}>
            <h3 className="showcase-title">Intelligent Gap Analysis</h3>
            <p className="showcase-desc">
              Understand the specific gaps in your resume, research publications, or recommendation list compared to successful candidates.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
            <div className="showcase-visual">
              <div className="mock-gap">
                <div className="mock-gap-bar">
                  <div className="mock-gap-bar-label"><span>Academic Prep</span><span>82%</span></div>
                  <div className="mock-gap-line"><div className="mock-gap-fill" style={{ width: '82%' }} /></div>
                </div>
                <div className="mock-gap-bar">
                  <div className="mock-gap-bar-label"><span>Work / Extracurriculars</span><span>45%</span></div>
                  <div className="mock-gap-line"><div className="mock-gap-fill" style={{ width: '45%' }} /></div>
                </div>
                <div className="mock-gap-bar">
                  <div className="mock-gap-bar-label"><span>Research & Letters</span><span>70%</span></div>
                  <div className="mock-gap-line"><div className="mock-gap-fill" style={{ width: '70%' }} /></div>
                </div>
              </div>
            </div>
            
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fee2e2', 
              borderRadius: 'var(--radius-lg)', 
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              color: 'var(--danger)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                ⚠ Critical Gap Identifiers
              </div>
              <p style={{ fontSize: '14px', color: '#7f1d1d', lineHeight: 1.6, marginBottom: '16px' }}>
                Your research scope requires 2 more publications or preprints to match recent admissions profiles.
              </p>
              <Link href="#" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', textDecoration: 'underline' }}>
                View Suggested Courses
              </Link>
            </div>
          </div>
        </div>

      </section>

      {/* Login Section */}
      <section className="login-section" id="login">
        <motion.div 
          className="login-card"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="login-icon">
            <KeyRound size={24} />
          </div>
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Powering your admissions journey with AI</p>

          <button 
            type="button" 
            className="google-login-btn" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading && loginMethod === 'google' ? (
              <div className="animate-pulse-soft">Signing in...</div>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.78 2.16c1.63-1.5 2.57-3.7c2.57-6.5z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.78-2.16c-.77.52-1.76.83-2.92.83-2.25 0-4.16-1.52-4.84-3.57L1.6 13.06C3.08 16 6.13 18 9 18z"/>
                  <path fill="#FBBC05" d="M4.16 10.9a5.39 5.39 0 0 1 0-3.4L1.6 5.34a8.99 8.99 0 0 0 0 7.32l2.56-1.76z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A8.99 8.99 0 0 0 1.6 5.34l2.56 1.76C4.84 5.1 6.75 3.58 9 3.58z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <div className="login-divider">
            <span>or email credentials</span>
          </div>

          <form onSubmit={handleCredentialsSubmit} style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email-login-inp">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)', zIndex: 1 }} />
                <input 
                  type="email" 
                  id="email-login-inp"
                  className="form-input" 
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  style={{ paddingLeft: '44px' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="password-login-inp">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-muted)', zIndex: 1 }} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  id="password-login-inp"
                  className="form-input" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    zIndex: 1
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-form-options">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
              <Link href="#" className="forgot-password">Forgot password?</Link>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="login-error"
                  initial={{ opacity: 0, y: -8, x: 0 }}
                  animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--danger)',
                    fontSize: '13px',
                    marginBottom: '16px',
                    fontWeight: 600,
                    background: '#fef2f2',
                    border: '1px solid #fee2e2',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px'
                  }}
                >
                  <AlertTriangle size={16} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', borderRadius: 'var(--radius-full)' }}
              disabled={loading}
            >
              {loading && loginMethod === 'credentials' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={18} className="login-spinner" /> Verifying...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>

          <p className="login-footer-text">
            Don&apos;t have an account? <Link href="/signup">Create an Account</Link>
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-logo">Placement <span>AI</span></div>
            <p className="footer-desc">
              Empowering students around the globe to achieve admissions to top-tier universities.
            </p>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Product</h4>
            <ul className="footer-links">
              <li><Link href="#features">Roadmap</Link></li>
              <li><Link href="#features">Document Engine</Link></li>
              <li><Link href="#features">Tracker</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links">
              <li><Link href="#">About Us</Link></li>
              <li><Link href="#">Careers</Link></li>
              <li><Link href="#">Contact</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4 className="footer-col-title">Legal</h4>
            <ul className="footer-links">
              <li><Link href="#">Privacy Policy</Link></li>
              <li><Link href="#">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2026 Placement AI. Sophisticated Guidance.</p>
          <div className="footer-bottom-links">
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
            <Link href="#">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
