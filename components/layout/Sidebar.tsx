'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface AuthMe {
  user: { role: string; name: string; doctorName: string | null; nurseTitle: string | null } | null;
}

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
    label: "Today's Doses",
    href: '/dosing',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3h18v18H3z" />
        <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
      </svg>
    ),
  },
];

const DEFAULTS: SidebarSettings = {
  clinic_name: 'Integrated Allergy',
  version_label: 'IMS v2.1 · © 2026',
};

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps = {}) {
  const pathname = usePathname();
  const [sidebarSettings, setSidebarSettings] = useState<SidebarSettings>(DEFAULTS);
  const [_userRole, setUserRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string; doctorName: string | null; nurseTitle: string | null } | null>(null);

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

    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data: AuthMe | null) => {
        setUserRole(data?.user?.role ?? null);
        setCurrentUser(data?.user ?? null);
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
    return pathname.startsWith(href);
  };

  const settingsActive = isActive('/settings');

  return (
    <>
      {/* Clinic branding */}
      <div style={{ padding: '10px 0 10px 8px', borderBottom: '1px solid #e5e7eb', flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
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
        {onClose && (
          <button
            onClick={onClose}
            className="mobile-close-btn"
            aria-label="Close menu"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px 8px',
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
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
              onClick={onClose}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logged-in identity card — above Settings */}
      {currentUser && (
        <div style={{ margin: '0 8px 8px', padding: '10px 12px', background: 'linear-gradient(135deg, #e8f9f7, #d0f4ef)', border: '1.5px solid #2ec4b6', borderRadius: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2ec4b6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                {(currentUser.doctorName ?? currentUser.name ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.doctorName ?? currentUser.name ?? ''}
              </div>
              <div style={{ fontSize: 10, color: '#0f766e', fontWeight: 600 }}>
                {currentUser.role === 'super_admin' ? '🔑 Super Admin' : currentUser.role}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout button — below identity card */}
      {currentUser && (
        <div style={{ margin: '0 8px 4px', flexShrink: 0 }}>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              color: '#6b7280',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; (e.currentTarget as HTMLButtonElement).style.color = '#dc2626'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#fca5a5'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; }}
          >
            <span>⎋</span> Sign Out
          </button>
        </div>
      )}

      {/* Settings — pinned at bottom above footer */}
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
          onClick={onClose}
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
      </div>
    </>
  );
}
