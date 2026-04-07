/**
 * @file components/ui/SkeletonRow.tsx — Loading skeleton placeholder for table rows
 *
 * Renders an animated shimmer table row used while table data is loading.
 * Each cell shows a shimmer bar with varying widths to simulate real content.
 * Used in clinical-table components (patients list, doctors, nurses, etc.).
 */

/**
 * A shimmering placeholder table row for use inside a `<tbody>`.
 * @param cols - Number of table cells to render (default: 5)
 */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  const widths = ['40px', '80%', '60%', '50%', '70%', '45%', '35%', '55%'];
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div
            style={{
              height: 14,
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-shimmer 1.5s infinite',
              borderRadius: 4,
              width: widths[i % widths.length],
            }}
          />
        </td>
      ))}
    </tr>
  );
}
