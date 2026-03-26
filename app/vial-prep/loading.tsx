import TopBar from '@/components/layout/TopBar';

function Shimmer({ width, height, radius = 4, style = {} }: { width: string | number; height: number; radius?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width, height, borderRadius: radius, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite', ...style }} />
  );
}

function SkeletonVialCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Shimmer width={60} height={14} />
        <Shimmer width={50} height={18} radius={12} />
      </div>
      <Shimmer width="80%" height={12} />
      <Shimmer width="60%" height={12} />
      <Shimmer width="50%" height={12} />
      <Shimmer width="40%" height={12} style={{ marginTop: 4 }} />
    </div>
  );
}

export default function Loading() {
  return (
    <>
      <TopBar
        title="Vial Preparation"
        breadcrumbs={[{ label: 'Integrated Allergy IMS' }, { label: 'Vial Prep' }]}
        actions={<div className="btn btn-primary" style={{ opacity: 0.4, pointerEvents: 'none' }}>🧪 New Vial Batch</div>}
      />
      <div className="page-content">
        {/* Safety alert placeholder */}
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <Shimmer width="70%" height={13} />
        </div>

        {/* Patient vial batches skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" style={{ marginBottom: 16, padding: 0 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Shimmer width={140} height={16} />
                <Shimmer width={70} height={12} />
              </div>
              <Shimmer width={100} height={28} radius={6} />
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {Array.from({ length: 4 }).map((_, j) => (
                <SkeletonVialCard key={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
