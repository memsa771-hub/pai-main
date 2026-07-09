'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Search, User, LogOut, ChevronDown, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  actionButton?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  showSearch = false, 
  searchPlaceholder = "Search...",
  actionButton 
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useApp();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { name: 'Chat Consultant', path: '/dashboard/chat' },
    { name: 'Roadmap', path: '/dashboard/roadmap' },
    { name: 'Documents', path: '/dashboard/documents' },
    { name: 'Applications', path: '/dashboard/applications' },
    { name: 'Uni Tracker', path: '/dashboard/uni-tracker' },
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

  return (
    <div style={{ background: 'transparent', width: '100%', display: 'flex', justifyContent: 'center', padding: '16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
      <style>{`
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8) !important;
          transition: all 0.2s ease;
          text-decoration: none;
          text-align: left;
          width: 100%;
          background: transparent;
          border: none;
          cursor: pointer;
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.06) !important;
          color: #60a5fa !important;
        }
        .header-profile-trigger:hover {
          background: rgba(255, 255, 255, 0.06) !important;
        }
      `}</style>

      {/* Unified Compact Navigation Bar */}
      <header 
        className="header" 
        style={{ 
          background: 'linear-gradient(180deg, #181d2a 0%, #0b0f19 100%)', 
          border: '1px solid rgba(255, 255, 255, 0.08)', 
          borderRadius: '14px', 
          color: '#ffffff', 
          boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.8), 0 10px 30px -4px rgba(59, 130, 246, 0.45)', 
          padding: '0 20px', 
          height: '54px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          maxWidth: '1200px', 
          width: 'calc(100% - 48px)',
          transition: 'all 0.3s ease' 
        }}
      >
        {/* Left: Logo */}
        <Link href="/dashboard/chat" className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Placement AI Logo" style={{ height: '18px', width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-heading)' }}>
            <span style={{ color: '#60a5fa' }}>Placement</span> <span style={{ color: '#ffffff' }}>AI</span>
          </span>
        </Link>

        {/* Middle: Horizontal Navigation Menu (No Icons, No Profile/Settings links) */}
        <nav className="header-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname?.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`header-nav-item ${isActive ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '12px',
                  background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  transition: 'all 0.2s',
                  textDecoration: 'none'
                }}
              >
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }} ref={dropdownRef}>
          {actionButton}
          
          {showSearch && (
            <div className="header-search" style={{ width: '140px', height: '28px', padding: '0 8px', background: '#1e293b', border: '1px solid #334155' }}>
              <Search size={12} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
              <input type="text" placeholder={searchPlaceholder} style={{ fontSize: '11px', color: '#ffffff', background: 'transparent', border: 'none' }} />
            </div>
          )}

          {/* User Profile Avatar acting as Dropdown Trigger */}
          <button 
            className="header-profile-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '4px 8px', 
              borderRadius: '8px', 
              background: 'transparent', 
              transition: 'all 0.2s ease',
              border: 'none',
              cursor: 'pointer'
            }}
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
            aria-label="User Account Menu"
          >
            <div className="header-avatar" style={{ width: '28px', height: '28px', fontSize: '11.5px', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : <User size={12} />}
            </div>
            <ChevronDown size={12} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
          </button>

          {/* Dropdown Menu (Profile, Settings, Logout) */}
          {isDropdownOpen && (
            <div 
              role="menu"
              style={{ 
                position: 'absolute', 
                top: '36px', 
                right: 0, 
                background: '#090d16', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '10px', 
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)', 
                width: '160px', 
                padding: '6px 0', 
                display: 'flex', 
                flexDirection: 'column', 
                zIndex: 110 
              }}
            >
              <div style={{ padding: '6px 16px', fontSize: '10.5px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '4px' }}>
                Account Utilities
              </div>
              
              <Link 
                href="/dashboard/profile" 
                className="dropdown-item" 
                onClick={() => setIsDropdownOpen(false)}
                role="menuitem"
              >
                <User size={13} />
                <span>My Profile</span>
              </Link>
              
              <Link 
                href="/dashboard/settings" 
                className="dropdown-item" 
                onClick={() => setIsDropdownOpen(false)}
                role="menuitem"
              >
                <SettingsIcon size={13} />
                <span>Settings</span>
              </Link>
              
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', marginTop: '4px', paddingTop: '4px' }} />
              
              <button 
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleLogout();
                }} 
                className="dropdown-item"
                style={{ color: '#ef4444 !important' }}
                role="menuitem"
              >
                <LogOut size={13} style={{ color: '#ef4444' }} />
                <span style={{ color: '#ef4444' }}>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>
    </div>
  );
};
