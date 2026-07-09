'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  actionButton?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  showSearch = false,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  actionButton
}) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '28px', 
        flexWrap: 'wrap', 
        gap: '16px',
        width: '100%',
        paddingTop: '8px'
      }}
    >
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px', color: '#0f172a' }}>{title}</h2>
        {subtitle && <p style={{ color: '#64748b', fontSize: '13.5px' }}>{subtitle}</p>}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {showSearch && (
          <div 
            className="header-search" 
            style={{ 
              width: '200px', 
              height: '32px', 
              padding: '0 10px', 
              background: '#f1f5f9', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}
          >
            <Search size={14} style={{ color: '#64748b' }} />
            <input 
              type="text" 
              placeholder={searchPlaceholder} 
              value={searchValue}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              style={{ 
                fontSize: '12px', 
                color: '#0f172a', 
                background: 'transparent', 
                border: 'none', 
                width: '100%', 
                outline: 'none' 
              }} 
            />
          </div>
        )}
        {actionButton}
      </div>
    </div>
  );
};
