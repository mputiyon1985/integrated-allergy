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
        title="Doctors"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Doctors' }]}
        actions={<div className="btn btn-primary" style={{ opacity: 0.4, pointerEvents: 'none' }}>+ Add Doctor</div>}
      />
      <div className="page-content">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['', 'Name', 'Title', 'Specialty', 'Clinic Location', 'NPI', 'Email', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <Shimmer width={40} height={40} radius={20} />
                  </td>
                  {[160, 50, 130, 160, 90, 140, 60, 120].map((w, j) => (
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
    </>
  );
}
