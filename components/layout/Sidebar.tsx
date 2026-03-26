'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface SidebarSettings {
  clinic_name: string;
  version_label: string;
}

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Patients',
    href: '/patients',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8"  y1="2" x2="8"  y2="6" />
        <line x1="3"  y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Allergens',
    href: '/allergens',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    label: 'Doctors',
    href: '/doctors',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 3.5c1.5.8 2.5 2.3 2.5 4" />
        <path d="M18.5 12H22M20.25 10.25v3.5" />
      </svg>
    ),
  },
  {
    label: 'Nurses',
    href: '/nurses',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M12 11v4M10 13h4" />
      </svg>
    ),
  },
  {
    label: 'Vial Prep',
    href: '/vial-prep',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
      </svg>
    ),
  },
  {
    label: 'Dosing',
    href: '/dosing',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h18v18H3z" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    ),
  },
  {
    label: 'Audit Log',
    href: '/audit-log',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

const DEFAULTS: SidebarSettings = {
  clinic_name: 'Integrated Allergy',
  version_label: 'IMS v2.0 · © 2026',
};

export default function Sidebar() {
  const pathname = usePathname();
  const [sidebarSettings, setSidebarSettings] = useState<SidebarSettings>(DEFAULTS);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setSidebarSettings({
          clinic_name: data.clinic_name || DEFAULTS.clinic_name,
          version_label: data.version_label || DEFAULTS.version_label,
        });
      })
      .catch(() => { /* keep defaults on error */ });
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const settingsActive = isActive('/settings');

  return (
    <aside className="sidebar" style={{ borderTop: '4px solid #2ec4b6', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
      {/* Clinic branding */}
      <div style={{ padding: '10px 0 10px 8px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
        <Image
          src="/integrated-allergy-logo.jpg"
          alt={sidebarSettings.clinic_name}
          width={160}
          height={55}
          style={{ height: 55, width: 'auto', display: 'block' }}
          priority
        />
        <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 8, paddingLeft: 2 }}>
          {sidebarSettings.version_label}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        <div style={{ padding: '8px 16px 4px', color: '#9ca3af', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                color: active ? '#0d9488' : '#1f2937',
                background: active ? '#e8f9f7' : 'transparent',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                borderLeft: active ? '3px solid #4db8ff' : '3px solid transparent',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = '#e8f9f7'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings link — pinned at bottom above footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', padding: '8px 0', flexShrink: 0 }}>
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            color: settingsActive ? '#0d9488' : '#374151',
            fontWeight: settingsActive ? 700 : 500,
            fontSize: 14,
            textDecoration: 'none',
            borderRadius: 8,
            margin: '0 4px',
            background: settingsActive ? '#e8f9f7' : 'transparent',
            borderLeft: settingsActive ? '3px solid #4db8ff' : '3px solid transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (!settingsActive) (e.currentTarget as HTMLAnchorElement).style.background = '#f3f4f6'; }}
          onMouseLeave={(e) => { if (!settingsActive) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: settingsActive ? 1 : 0.7 }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </Link>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 11, flexShrink: 0 }}>
        <div>© 2026 {sidebarSettings.clinic_name}</div>
        <div style={{ marginTop: 2 }}>Clinical IMS Platform</div>
      </div>
    </aside>
  );
}
