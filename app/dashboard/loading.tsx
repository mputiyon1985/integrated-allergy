import TopBar from '@/components/layout/TopBar';

function Shimmer({ width, height, radius = 4, style = {} }: { width: string | number; height: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width, height, borderRadius: radius, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', ...style }} />
  );
}

function SkeletonKpiCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: 110, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Shimmer width={24} height={24} radius={4} />
      <Shimmer width="60%" height={10} />
      <Shimmer width="40%" height={32} style={{ marginTop: 2 }} />
      <Shimmer width="50%" height={9} />
    </div>
  );
}

export default function Loading() {
  return (
    <>
      <TopBar
        title="Dashboard"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Dashboard' }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shimmer width={90} height={28} radius={6} />
            <Shimmer width={90} height={28} radius={6} />
            <Shimmer width={120} height={13} />
          </div>
        }
      />
      <div className="page-content">
        {/* KPI grid skeleton — 4 across */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </div>

        {/* Recent activity skeleton */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Shimmer width={130} height={14} />
            <Shimmer width={60} height={11} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  {['Timestamp', 'Type', 'Patient', 'Details', 'User'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[120, 100, 110, '50%', 80].map((w, j) => (
                      <td key={j} style={{ padding: '12px 14px' }}>
                        <Shimmer width={w} height={14} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
