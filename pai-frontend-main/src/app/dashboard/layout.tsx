'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Sidebar } from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const isChatPage = pathname === '/dashboard/chat';

  return (
    <ProtectedRoute>
      <div className="dashboard-container" style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <div 
          className="dashboard-main" 
          style={{ 
            flex: 1, 
            marginLeft: isSidebarOpen ? '220px' : '68px', 
            transition: 'margin-left .42s cubic-bezier(.22,1,.36,1)',
            padding: isChatPage ? '0px' : '24px 32px',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden'
          }}
        >
          {children}
        </div>
      </div>
    </ProtectedRoute>
  );
}
