import TopBar from '@/components/layout/TopBar';

function Shimmer({ width, height, radius = 4, style = {} }: { width: string | number; height: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

export default function Loading() {
  return (
    <>
      <TopBar
        title="Patients"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Patients' }]}
        actions={
          <div className="btn btn-primary" style={{ opacity: 0.4, pointerEvents: 'none' }}>
            + New Patient
          </div>
        }
      />
      <div className="page-content">
        {/* Search bar skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Shimmer width={280} height={34} radius={8} />
          <Shimmer width={80} height={13} radius={4} />
        </div>
        {/* Table skeleton */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  {['Patient ID', 'Name', 'DOB', 'Physician', 'Diagnosis', 'Status', 'Actions'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[40, '80%', '55%', '65%', '70%', 60, 50].map((w, j) => (
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
