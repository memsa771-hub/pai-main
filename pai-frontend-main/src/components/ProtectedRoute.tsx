'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isAuthReady } = useApp();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isAuthReady) return;

    const token = localStorage.getItem('placement-ai-token');
    if (!isLoggedIn || !token) {
      router.push('/');
    } else {
      setIsChecking(false);
    }
  }, [isLoggedIn, isAuthReady, router]);

  if (!isAuthReady || isChecking) {
    return (
      <div className="flex-center" style={{ height: '100vh', width: '100vw', flexDirection: 'column', gap: '16px' }}>
        <div className="animate-pulse-soft" style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
          Placement <span style={{ color: 'var(--primary)' }}>AI</span>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>Verifying session...</div>
      </div>
    );
  }

  return <>{children}</>;
};
