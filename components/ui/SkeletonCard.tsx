/**
 * @file components/ui/SkeletonCard.tsx — Loading skeleton placeholder for KPI cards
 *
 * Renders an animated shimmer card used while dashboard KPI data is loading.
 * Mirrors the visual structure of KpiCard (icon, label, value, subtitle areas).
 * The `skeleton-shimmer` CSS animation is defined in globals.css.
 */

/**
 * A shimmering placeholder card matching the KpiCard dimensions.
 * @param height - Card height in pixels (default: 110)
 */
export function SkeletonCard({ height = 110 }: { height?: number }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: 20,
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        height,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* icon placeholder */}
      <div
        style={{
          height: 24,
          width: 24,
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.5s infinite',
          borderRadius: 4,
        }}
      />
      {/* label */}
      <div
        style={{
          height: 10,
          width: '60%',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.5s infinite',
          borderRadius: 4,
        }}
      />
      {/* value */}
      <div
        style={{
          height: 32,
          width: '40%',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.5s infinite',
          borderRadius: 4,
          marginTop: 4,
        }}
      />
      {/* sub text */}
      <div
        style={{
          height: 9,
          width: '50%',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-shimmer 1.5s infinite',
          borderRadius: 4,
        }}
      />
    </div>
  );
}
