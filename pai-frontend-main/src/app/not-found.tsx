'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Compass } from 'lucide-react';

export default function NotFoundPage() {
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
          textAlign: 'center',
          maxWidth: '480px',
        }}
      >
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px auto',
        }}>
          <Compass size={40} color="#ffffff" />
        </div>

        <h1 style={{
          fontSize: '64px',
          fontWeight: 800,
          color: '#0f172a',
          margin: '0 0 8px 0',
          lineHeight: 1,
        }}>
          404
        </h1>

        <h2 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#334155',
          marginBottom: '12px',
        }}>
          Page Not Found
        </h2>

        <p style={{
          fontSize: '14px',
          color: '#64748b',
          lineHeight: 1.6,
          marginBottom: '32px',
        }}>
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track with your admissions journey.
        </p>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Link
            href="/"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
          >
            <Home size={16} />
            Go Home
          </Link>

          <Link
            href="/chat"
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#64748b',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <ArrowLeft size={16} />
            Go to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}