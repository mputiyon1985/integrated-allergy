'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid #FCA5A5', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>Something went wrong</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>An unexpected error occurred. Please try again or contact support if the problem persists.</p>
        {process.env.NODE_ENV === 'development' && (
          <pre style={{ fontSize: '11px', color: '#EF4444', background: '#FEF2F2', padding: '12px', borderRadius: '8px', textAlign: 'left', overflow: 'auto', marginBottom: '16px' }}>
            {error.message}
          </pre>
        )}
        <button onClick={reset} style={{ background: '#2ec4b6', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    </div>
  );
}
