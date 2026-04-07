/**
 * @file components/layout/TopBar.tsx — Page-level header with title, breadcrumbs, and actions
 *
 * Renders the horizontal top bar that appears at the top of every authenticated page.
 * Contains:
 * - Mobile hamburger menu button (triggers sidebar open via TopBarContext)
 * - Page breadcrumb trail
 * - Page title (h1)
 * - Optional action buttons/elements (right-aligned)
 *
 * The onMenuClick handler can be provided directly or pulled from TopBarContext
 * (set by ClientLayout). Pages pass title + actions; ClientLayout provides the menu trigger.
 */
'use client';

import React from 'react';
import { useTopBarContext } from './TopBarContext';

/** A single item in the breadcrumb navigation trail. */
interface BreadcrumbItem {
  /** Display text for this breadcrumb segment */
  label: string;
  /** Optional href — makes this segment a clickable link */
  href?: string;
}

/**
 * Props for the TopBar component.
 */
interface TopBarProps {
  /** Main page heading displayed in the top bar */
  title: string;
  /** Optional breadcrumb trail shown above the title */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional React node (buttons, etc.) rendered on the right side */
  actions?: React.ReactNode;
  /** Optional override for the mobile menu button handler (defaults to TopBarContext) */
  onMenuClick?: () => void;
}

/**
 * Renders the page-level top bar with a mobile hamburger, breadcrumbs, title, and actions.
 * Falls back to TopBarContext's onMenuClick if no explicit handler is provided.
 */
export default function TopBar({ title, breadcrumbs, actions, onMenuClick }: TopBarProps) {
  const ctx = useTopBarContext();
  const handleMenu = onMenuClick ?? ctx.onMenuClick;

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Hamburger — mobile only */}
        <button
          onClick={handleMenu}
          className="mobile-menu-btn"
          aria-label="Open menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: 4,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          ☰
        </button>
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
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {actions}
        </div>
      )}
    </header>
  );
}
