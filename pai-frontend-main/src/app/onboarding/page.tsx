'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import './onboarding.css';

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoggedIn, profile } = useApp();
  const [showContent, setShowContent] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      return;
    }
    // Brief delay so the animation plays
    setShowContent(true);

    // Auto-redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard/chat');
    }, 3500);

    return () => clearTimeout(timer);
  }, [isLoggedIn, router]);

  const firstName = profile?.name?.split(' ')[0] || 'there';

  if (!showContent) return null;

  return (
    <div className="onboarding-container">
      <div className="onboarding-glow-orb" />
      <div className="onboarding-glow-orb-2" />

      {/* Animated Welcome Content */}
      <motion.div
        className="welcome-card"
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Animated Icon */}
        <motion.div
          className="welcome-icon-wrap"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 180, damping: 14 }}
        >
          <Sparkles size={36} />
        </motion.div>

        <motion.h1
          className="welcome-title"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Welcome, {firstName}!
        </motion.h1>

        <motion.p
          className="welcome-subtitle"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Your AI-powered admissions companion is ready. We&apos;re setting up your personalized dashboard...
        </motion.p>

        {/* Animated progress dots */}
        <motion.div
          className="welcome-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <div className="welcome-progress-track">
            <div className="welcome-progress-fill" />
          </div>
          <span className="welcome-progress-text">Preparing your workspace</span>
        </motion.div>

        {/* Skip button */}
        <motion.button
          className="welcome-skip-btn"
          onClick={() => router.push('/dashboard/chat')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.4 }}
        >
          Go to Dashboard <ArrowRight size={16} />
        </motion.button>
      </motion.div>
    </div>
  );
}
