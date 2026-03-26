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
        title="Calendar"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Calendar' }]}
        actions={<div className="btn btn-primary" style={{ opacity: 0.4, pointerEvents: 'none' }}>+ New Appointment</div>}
      />
      <div className="page-content">
        {/* Nav controls skeleton */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Shimmer width={28} height={28} radius={6} />
            <Shimmer width={180} height={20} radius={4} />
            <Shimmer width={28} height={28} radius={6} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[55, 55, 50].map((w, i) => <Shimmer key={i} width={w} height={30} radius={6} />)}
          </div>
        </div>

        {/* Calendar card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Day header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
              <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {d}
              </div>
            ))}
          </div>
          {/* Cell grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                style={{
                  minHeight: 90,
                  borderRight: i % 7 !== 6 ? '1px solid #f3f4f6' : 'none',
                  borderBottom: i < 28 ? '1px solid #f3f4f6' : 'none',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <Shimmer width={20} height={20} radius={10} />
                {i % 3 === 0 && <Shimmer width="90%" height={18} style={{ background: 'linear-gradient(90deg, #e8f0fe 25%, #d2e3fc 50%, #e8f0fe 75%)', backgroundSize: '200% 100%' }} />}
                {i % 5 === 0 && <Shimmer width="75%" height={18} style={{ background: 'linear-gradient(90deg, #e8f5e9 25%, #c8e6c9 50%, #e8f5e9 75%)', backgroundSize: '200% 100%' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
