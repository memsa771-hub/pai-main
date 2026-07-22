'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect /dashboard to /chat (main dashboard view)
    router.replace('/chat');
  }, [router]);

  return null;
}