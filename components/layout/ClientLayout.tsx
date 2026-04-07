'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBarContext from './TopBarContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname?.startsWith('/login');

  // Warm up DB connection + pre-cache the most-visited pages on app load
  useEffect(() => {
    if (!isAuthPage) {
      // Fire in background — don't await, just warm the connection + CDN cache
      // Round 1 — DB warm-up + most critical pages
      Promise.allSettled([
        fetch('/api/ping', { cache: 'no-store' }),
        fetch('/api/dashboard', { cache: 'no-store' }),
        fetch('/api/patients?limit=50', { cache: 'default' }),
        fetch('/api/doctors?active=true', { cache: 'default' }),
        fetch('/api/nurses?active=true', { cache: 'default' }),
      ]).then(() => {
        // Round 2 — secondary pages, after DB is warm
        Promise.allSettled([
          fetch('/api/settings', { cache: 'default' }),
          fetch('/api/allergens', { cache: 'default' }),
          fetch('/api/locations?active=true', { cache: 'default' }),
          fetch('/api/diagnoses?active=true', { cache: 'default' }),
          fetch('/api/doctor-titles?active=true', { cache: 'default' }),
          fetch('/api/nurse-titles?active=true', { cache: 'default' }),
        ]).catch(() => {});
      }).catch(() => {});
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
