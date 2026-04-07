'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBarContext from './TopBarContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname?.startsWith('/login');

  // Warm up DB connection on app load so first nav feels fast
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
