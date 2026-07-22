'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, ArrowDown, ChevronLeft, ChevronRight, 
  Sparkles, FileText, CheckSquare, AlertTriangle, Lightbulb, Compass, Trash2,
} from 'lucide-react';
import Link from 'next/link';
import '@/app/landing.css';

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn } = useApp();

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
      router.push('/chat');
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % benefits.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [benefits.length]);

  const scrollToLogin = () => {
    router.push('/login');
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

      {/* Benefits Carousel */}
      <section className="benefits-section">
        <div style={{ maxWidth: '1100px', margin: '0 auto 40px auto', textAlign: 'center' }}>
          <span className="showcase-tag" style={{ marginBottom: '12px' }}>Platform Value</span>
          <h2 style={{ fontSize: '38px', fontWeight: 800, color: '#0f172a' }}>
            Benefits of using <span style={{ color: 'var(--primary)' }}>Placement AI</span>
          </h2>
        </div>

        <div className="benefits-container">
          <div className="benefits-char-wrap">
            <div className="benefits-char-glow" />
            <div className="benefits-char-body">
              <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="80" stroke="rgba(0, 45, 156, 0.25)" strokeWidth="1.5">
                  <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="10s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="100" r="70" stroke="rgba(79, 70, 229, 0.15)" strokeWidth="1" strokeDasharray="10 10">
                  <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="8s" repeatCount="indefinite" />
                </circle>
                <ellipse cx="100" cy="170" rx="30" ry="5" fill="rgba(15, 23, 42, 0.12)" />
                <rect x="70" y="55" width="60" height="60" rx="30" fill="white" stroke="url(#paint_linear_car)" strokeWidth="3.5" />
                <rect x="76" y="63" width="48" height="36" rx="18" fill="#1e293b" />
                <ellipse cx="90" cy="80" rx="5" ry="5" fill="#60a5fa">
                  <animate attributeName="ry" values="5;5;0.5;5;5" dur="3.5s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="110" cy="80" rx="5" ry="5" fill="#60a5fa">
                  <animate attributeName="ry" values="5;5;0.5;5;5" dur="3.5s" repeatCount="indefinite" />
                </ellipse>
                <circle cx="50" cy="105" r="6" fill="white" stroke="var(--primary)" strokeWidth="1.5">
                  <animate attributeName="transform" type="translate" values="0 0; 0 -4; 0 0" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <defs>
                  <linearGradient id="paint_linear_car" x1="70" y1="55" x2="130" y2="115" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--primary)" />
                    <stop offset="1" stopColor="var(--secondary)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

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
            <div className="carousel-controls">
              <button onClick={() => setCurrentSlide(prev => (prev - 1 + benefits.length) % benefits.length)} className="carousel-nav-btn" aria-label="Previous slide">
                <ChevronLeft size={18} />
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {benefits.map((_, idx) => (
                  <div key={idx} onClick={() => setCurrentSlide(idx)} className={`carousel-dot ${currentSlide === idx ? 'active' : ''}`} />
                ))}
              </div>
              <button onClick={() => setCurrentSlide(prev => (prev + 1) % benefits.length)} className="carousel-nav-btn" aria-label="Next slide">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Three Steps */}
      <section className="steps-section" id="steps">
        <div className="steps-container">
          <div className="steps-list">
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '38px', fontWeight: 800, lineHeight: 1.2 }}>
                Strategic Integration in<br />
                <span style={{ color: 'var(--primary)' }}>Three Steps</span>
              </h2>
            </div>
            {[
              { num: 1, title: "Onboarding & Profiling", desc: "Provide your basic profile info and university goals to generate your initial admissions footprint." },
              { num: 2, title: "Roadmap Generation", desc: "Receive a personalized step-by-step roadmap outlining exams, recommendations, and timeline goals." },
              { num: 3, title: "Active Optimization", desc: "Refine and optimize your materials (SOPs, LORs) dynamically using our customized AI feedback models." }
            ].map((step, idx) => (
              <motion.div key={idx} className="step-row" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.15, duration: 0.6 }}>
                <div className="step-num-circle">{step.num}</div>
                <div className="step-info">
                  <h3 className="step-info-title">{step.title}</h3>
                  <p className="step-info-desc">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="character-wrap">
            <div className="character-glow" />
            <div className="character-body">
              <svg width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="85" stroke="rgba(0, 45, 156, 0.2)" strokeWidth="1" strokeDasharray="5 5">
                  <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="15s" repeatCount="indefinite" />
                </circle>
                <rect x="65" y="55" width="70" height="70" rx="35" fill="white" stroke="url(#paint0_linear2)" strokeWidth="4" />
                <rect x="73" y="65" width="54" height="42" rx="21" fill="#0f172a" />
                <ellipse cx="88" cy="86" rx="6" ry="6" fill="#60a5fa">
                  <animate attributeName="ry" values="6;6;0.5;6;6" dur="4s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="112" cy="86" rx="6" ry="6" fill="#60a5fa">
                  <animate attributeName="ry" values="6;6;0.5;6;6" dur="4s" repeatCount="indefinite" />
                </ellipse>
                <circle cx="45" cy="115" r="8" fill="white" stroke="var(--primary)" strokeWidth="2">
                  <animate attributeName="transform" type="translate" values="0 0; 0 -6; 0 0" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="155" cy="115" r="8" fill="white" stroke="var(--primary)" strokeWidth="2">
                  <animate attributeName="transform" type="translate" values="0 0; 0 -6; 0 0" dur="3.2s" repeatCount="indefinite" />
                </circle>
                <defs>
                  <linearGradient id="paint0_linear2" x1="60" y1="45" x2="140" y2="175" gradientUnits="userSpaceOnUse">
                    <stop stopColor="var(--primary)" />
                    <stop offset="1" stopColor="var(--secondary)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-logo">Placement <span>AI</span></div>
            <p className="footer-desc">Empowering students around the globe to achieve admissions to top-tier universities.</p>
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