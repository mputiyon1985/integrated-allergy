import TopBar from '@/components/layout/TopBar';

function Shimmer({ width, height, radius = 4, style = {} }: { width: string | number; height: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width, height, borderRadius: radius, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', ...style }} />
  );
}

export default function Loading() {
  return (
    <>
      <TopBar
        title="Patient Detail"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Patients', href: '/patients' }, { label: '…' }]}
      />
      <div className="page-content">
        {/* Patient header card */}
        <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <Shimmer width={48} height={48} radius={24} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Shimmer width="35%" height={20} />
              <Shimmer width="20%" height={12} />
            </div>
            <Shimmer width={80} height={22} radius={12} />
          </div>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} width={90} height={32} radius={0} style={{ borderRadius: '6px 6px 0 0' }} />
            ))}
          </div>
        </div>
        {/* Tab content */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {Array.from({ length: 2 }).map((_, col) => (
              <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Shimmer width="40%" height={13} style={{ marginBottom: 4 }} />
                {Array.from({ length: 5 }).map((_, r) => (
                  <div key={r} style={{ display: 'flex', gap: 12 }}>
                    <Shimmer width="30%" height={12} />
                    <Shimmer width="55%" height={12} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
