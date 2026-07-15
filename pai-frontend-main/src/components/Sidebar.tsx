'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  ChevronDown, LogOut, User, Settings as SettingsIcon, Sidebar as ColumnsIcon,
  MessageSquare, Compass, FileText, Landmark, TrendingUp, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { name: 'PAI', path: '/dashboard/chat', icon: <MessageSquare size={13} /> },
    { name: 'Roadmap', path: '/dashboard/roadmap', icon: <Compass size={13} /> },
    { name: 'Documents', path: '/dashboard/documents', icon: <FileText size={13} /> },
    { name: 'Applications', path: '/dashboard/applications', icon: <Landmark size={13} /> },
    { name: 'Uni Tracker', path: '/dashboard/uni-tracker', icon: <TrendingUp size={13} /> },
    { name: 'Profile', path: '/dashboard/profile', icon: <User size={13} /> },
    { name: 'Settings', path: '/dashboard/settings', icon: <SettingsIcon size={13} /> },
  ];

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to wrap icon in 3D claymorphic capsule (shown only when collapsed)
  const render3dIcon = (iconElement: React.ReactNode, isActive: boolean) => {
    return (
      <div 
        className="icon-3d-wrapper"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isActive ? '#ffffff' : '#f8fafc',
          border: isActive ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
          boxShadow: isActive 
            ? '0 3px 0 0 #94a3b8, 0 2px 4px rgba(0, 0, 0, 0.05)' 
            : '0 3px 0 0 #cbd5e1, 0 1px 3px rgba(0, 0, 0, 0.02)',
          color: isActive ? '#0033cc' : '#64748b',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isActive ? 'translateY(1px)' : 'none',
          flexShrink: 0
        }}
      >
        {iconElement}
      </div>
    );
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <aside 
      className={`sidebar-nav-container ${isOpen ? 'open' : 'collapsed'}`}
      style={{
        position: 'fixed',
        left: isMobile ? (isOpen ? '0px' : '-240px') : '0px',
        top: '0px',
        bottom: '0px',
        width: isMobile ? '220px' : (isOpen ? '220px' : '68px'),
        background: '#ffffff', // Clean white background
        borderRight: '1px solid #e2e8f0', // Clean separator line on the right edge
        borderRadius: '0px', // Flush to left edge to cover empty space
        boxShadow: '4px 0 20px rgba(0, 0, 0, 0.02)', // Soft light shadow
        display: 'flex',
        flexDirection: 'column',
        zIndex: isMobile ? 1000 : 99,
        transition: 'width .42s cubic-bezier(.22,1,.36,1), left .42s cubic-bezier(.22,1,.36,1), padding .42s cubic-bezier(.22,1,.36,1)',
        overflow: 'visible',
        padding: '20px 10px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      }}
    >
      <style>{`
        .sidebar-item {
          display: flex;
          align-items: center;
          color: #475569 !important;
          transition:
            background .28s cubic-bezier(.22,1,.36,1),
            color .28s cubic-bezier(.22,1,.36,1),
            padding .28s cubic-bezier(.22,1,.36,1);
          background: transparent;
          text-decoration: none;
          border-radius: 8px;
          position: relative;
        }
        .sidebar-item:hover {
          color: #1e293b !important;
          background: rgba(0, 0, 0, 0.03) !important;
        }
        .sidebar-item:hover .sidebar-icon-wrap {
          color: #1e293b !important;
        }
        .sidebar-item.active {
          color: #2563eb !important;
          background: rgba(37, 99, 235, 0.06) !important;
        }

        /* Smooth Sliding Text Spans */
        .sidebar-item-label {
          white-space: nowrap;
          opacity: 1;
          max-width: 150px;
          transition: 
            opacity .28s cubic-bezier(.22,1,.36,1),
            max-width .42s cubic-bezier(.22,1,.36,1),
            transform .28s cubic-bezier(.22,1,.36,1),
            filter .28s cubic-bezier(.22,1,.36,1),
            margin-left .42s cubic-bezier(.22,1,.36,1);
          display: inline-block;
          overflow: hidden;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: -0.01em;
          line-height: 20px;
          margin-left: 10px;
          transform: translateX(0) scale(1);
          filter: blur(0);
        }
        .sidebar-item.active .sidebar-item-label {
          font-weight: 600;
          color: #2563eb;
        }
        .sidebar-nav-container.collapsed .sidebar-item-label {
          opacity: 0;
          max-width: 0px;
          transform: translateX(-18px) scale(.92);
          filter: blur(3px);
          pointer-events: none;
          margin-left: 0px;
        }

        /* Custom Tooltip for Collapsed Sidebar Items */
        .sidebar-nav-container.collapsed .sidebar-item {
          position: relative;
        }
        .sidebar-nav-container.collapsed .sidebar-item::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%) translateX(8px) scale(.95);
          background: #0f172a;
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition:
            opacity .22s cubic-bezier(.22,1,.36,1),
            transform .28s cubic-bezier(.22,1,.36,1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 999;
          pointer-events: none;
        }
        .sidebar-nav-container.collapsed .sidebar-item:hover::after {
          opacity: 1;
          visibility: visible;
          transform: translateY(-50%) translateX(16px) scale(1);
        }

        /* Header logo and toggle transition */
        .sidebar-logo-text {
          opacity: 1;
          max-width: 150px;
          transition: opacity 0.2s ease, max-width 0.35s cubic-bezier(.22,1,.36,1);
          white-space: nowrap;
          display: inline-block;
        }
        .sidebar-nav-container.collapsed .sidebar-logo-text {
          opacity: 0;
          max-width: 0px;
          pointer-events: none;
        }

        /* Minimal Column Toggle Button */
        .sidebar-toggle-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          transition: color 0.2s ease;
          flex-shrink: 0;
        }
        .sidebar-toggle-btn:hover {
          color: #1e3a8a;
          background: transparent;
        }

        /* Logo link animation (linear/vercel style transition) */
        .sidebar-logo-link {
          transition:
            transform .45s cubic-bezier(.22,1,.36,1),
            opacity .3s cubic-bezier(.22,1,.36,1);
        }

        /* Morphing behaviour when collapsed */
        .sidebar-nav-container.collapsed .sidebar-logo-link {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
          z-index: 10;
        }
        .sidebar-nav-container.collapsed .sidebar-header:hover .sidebar-logo-link {
          transform: translate(-50%, -50%) scale(0.85);
          opacity: 0;
          pointer-events: none;
        }

        .sidebar-nav-container.collapsed .sidebar-toggle-btn {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(0.85);
          opacity: 0;
          z-index: 5;
          pointer-events: none;
        }
        .sidebar-nav-container.collapsed .sidebar-header:hover .sidebar-toggle-btn {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
          pointer-events: auto;
          z-index: 20;
        }

        /* Profile footer sliding transitions */
        .sidebar-profile-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
          overflow: hidden;
          opacity: 1;
          max-width: 180px;
          transition: opacity 0.2s ease, max-width 0.35s cubic-bezier(.22,1,.36,1);
        }
        .sidebar-nav-container.collapsed .sidebar-profile-details {
          opacity: 0;
          max-width: 0px;
          pointer-events: none;
        }

        .sidebar-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          font-size: 12.5px;
          color: #64748b !important;
          transition: all 0.2s ease;
          text-decoration: none;
          text-align: left;
          width: 100%;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .sidebar-dropdown-item:hover {
          background: rgba(0, 0, 0, 0.03) !important;
          color: #000000 !important;
        }

        /* Profile button custom styling */
        .sidebar-profile-btn {
          background: #fafafa;
          border: 1px solid #edf2f7;
          border-radius: 14px;
          transition: all .28s cubic-bezier(.22,1,.36,1);
        }
        .sidebar-profile-btn:hover {
          background: white;
          box-shadow: 0 10px 24px rgba(0,0,0,.06);
        }

        /* Icon Animation */
        .sidebar-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          flex-shrink: 0;
          transition: color .25s cubic-bezier(.22,1,.36,1);
        }
      `}</style>

      {/* Header section (Logo and Toggle columns icon) */}
      <div 
        className="sidebar-header"
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '20px',
          padding: '0 8px',
          width: '100%',
          height: '40px',
          position: 'relative'
        }}
      >
        {/* Logo link: always mounted, fades out text when collapsed */}
        <Link 
          href="/dashboard/chat" 
          className="sidebar-logo-link"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            textDecoration: 'none',
            flexShrink: 0
          }}
        >
          <img 
            src="/logo.png" 
            alt="Placement AI Logo" 
            className="sidebar-logo-img"
            style={{ 
              height: '18px', 
              width: 'auto', 
              objectFit: 'contain',
              flexShrink: 0
            }} 
          />
          <span className="sidebar-logo-text" style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', color: '#000000' }}>
            <span style={{ color: '#2563eb' }}>Placement</span>{' '}
            <span style={{ color: '#000000' }}>AI</span>
          </span>
        </Link>

        {/* Toggle Button: always mounted, morphs on hover when collapsed */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="sidebar-toggle-btn"
          title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          <ColumnsIcon size={15} />
        </button>
      </div>

      {/* Menu Navigation Links */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path || pathname?.startsWith(item.path);
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              data-tooltip={item.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: isOpen ? '8px 12px' : '8px 4px',
                marginBottom: '4px',
                width: '100%',
                textDecoration: 'none'
              }}
            >
              {/* Flat clean icon matching the UI */}
              <div 
                className="sidebar-icon-wrap"
                style={{
                  color: isActive ? '#2563eb' : '#64748b'
                }}
              >
                {React.cloneElement(item.icon as React.ReactElement, { size: 18 } as any)}
              </div>

              <span className="sidebar-item-label">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile Dropdown section */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center' 
        }} 
        ref={dropdownRef}
      >
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="sidebar-profile-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isOpen ? 'space-between' : 'center',
            width: '100%',
            padding: '8px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{ 
              width: '28px', 
              height: '28px', 
              fontSize: '11px', 
              background: '#0033cc', 
              color: '#ffffff', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 700,
              flexShrink: 0
            }}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            
            <div className="sidebar-profile-details">
              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#000000', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.name || 'User'}
                </div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>
                  Student
                </div>
              </div>
              <ChevronDown size={12} style={{ color: '#64748b', marginLeft: '8px', flexShrink: 0 }} />
            </div>
          </div>
        </button>

        {/* Dropdown popup */}
        {isDropdownOpen && (
          <div 
            style={{ 
              position: 'absolute', 
              bottom: '100%', 
              left: isOpen ? '0' : '50%',
              transform: isOpen ? 'none' : 'translateX(-50%)',
              marginBottom: '8px',
              background: '#ffffff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '10px', 
              boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.08)', 
              width: '160px', 
              padding: '6px 0', 
              display: 'flex', 
              flexDirection: 'column', 
              zIndex: 110 
            }}
          >
            <div style={{ padding: '6px 16px', fontSize: '9.5px', color: '#64748b', borderBottom: '1px solid #f8fafc', marginBottom: '4px' }}>
              Utilities
            </div>
            
            <Link 
              href="/dashboard/profile" 
              className="sidebar-dropdown-item" 
              onClick={() => setIsDropdownOpen(false)}
            >
              <User size={13} />
              <span>My Profile</span>
            </Link>
            
            <Link 
              href="/dashboard/settings" 
              className="sidebar-dropdown-item" 
              onClick={() => setIsDropdownOpen(false)}
            >
              <SettingsIcon size={13} />
              <span>Settings</span>
            </Link>
            
            <div style={{ borderTop: '1px solid #f8fafc', marginTop: '4px', paddingTop: '4px' }} />
            
            <button 
              onClick={() => {
                setIsDropdownOpen(false);
                handleLogout();
              }} 
              className="sidebar-dropdown-item"
              style={{ color: '#ef4444 !important' }}
            >
              <LogOut size={13} style={{ color: '#ef4444' }} />
              <span style={{ color: '#ef4444' }}>Sign Out</span>
            </button>
          </div>
        )}
      </div>

    </aside>
  );
};
