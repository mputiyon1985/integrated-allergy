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
        title="Allergen Library"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Allergens' }]}
        actions={<div className="btn btn-primary" style={{ opacity: 0.4, pointerEvents: 'none' }}>+ Add Allergen</div>}
      />
      <div className="page-content">
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <Shimmer width={280} height={34} radius={8} />
          <Shimmer width={160} height={34} radius={6} />
          <Shimmer width={80} height={13} radius={4} style={{ marginLeft: 'auto' }} />
        </div>
        {/* Table */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  {['Name', 'Type', 'Manufacturer', 'Lot #', 'Stock Conc.', 'Expires', 'Status'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {[140, 80, 120, 70, 80, 90, 60].map((w, j) => (
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
