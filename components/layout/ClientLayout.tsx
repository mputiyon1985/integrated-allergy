/**
 * @file components/layout/ClientLayout.tsx — Root application shell (client component)
 *
 * Wraps all authenticated pages with the sidebar navigation and TopBar context.
 * On non-auth pages (/login), renders children without the shell.
 *
 * Behavior:
 * - Detects the current route to determine if the sidebar should be shown.
 * - Manages mobile sidebar open/close state.
 * - Fires a single /api/ping request on first load to warm the Turso DB connection.
 * - Provides TopBarContext so child components can trigger the mobile menu toggle.
 */
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBarContext from './TopBarContext';

/**
 * Root layout shell that conditionally renders the sidebar for authenticated routes.
 * Auth pages (login) render children without the sidebar or overlay.
 */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Controls mobile sidebar visibility (toggle via hamburger button in TopBar)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname?.startsWith('/login');

  // Single ping to warm DB connection — avoids flooding lambdas with parallel cold starts
  useEffect(() => {
    if (!isAuthPage) {
      fetch('/api/ping', { cache: 'no-store' }).catch(() => {});
    }
  }, [isAuthPage]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <TopBarContext.Provider value={{ onMenuClick: () => setSidebarOpen(true) }}>
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} style={{ borderTop: '4px solid #2ec4b6', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 150,
          }}
        />
      )}
      <div className="main-layout">
        {children}
      </div>
    </TopBarContext.Provider>
  );
}
