import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid #E5E7EB', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>Page not found</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>The page you are looking for does not exist or has been moved.</p>
        <Link href="/dashboard" style={{ background: '#2ec4b6', color: '#fff', borderRadius: '10px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
