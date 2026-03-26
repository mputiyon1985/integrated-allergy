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
        title="Dosing Schedule"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Dosing' }]}
        actions={<div className="btn btn-primary" style={{ opacity: 0.4, pointerEvents: 'none' }}>+ Record Dose</div>}
      />
      <div className="page-content">
        {/* Filter row */}
        <div style={{ marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <Shimmer width={120} height={13} />
          <Shimmer width={240} height={34} radius={6} />
          <Shimmer width={80} height={13} style={{ marginLeft: 'auto' }} />
        </div>
        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  {['Patient', 'Week', 'Vial', 'Dose (mL)', 'Phase', 'Status', 'Reaction', 'Notes'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[120, 60, 90, 55, 70, 80, 50, '40%'].map((w, j) => (
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
