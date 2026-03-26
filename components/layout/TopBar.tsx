'use client';

import React from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopBarProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export default function TopBar({ title, breadcrumbs, actions }: TopBarProps) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.6)' }}>›</span>}
                {bc.href ? (
                  <a href={bc.href} style={{ color: '#fff', textDecoration: 'none', opacity: 0.9 }}>
                    {bc.label}
                  </a>
                ) : (
                  <span>{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        <h1
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
