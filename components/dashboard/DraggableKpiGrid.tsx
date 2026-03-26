'use client';

import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { KpiCard } from './KpiCard';
import type { DashboardStats, KpiDef } from './types';

interface Props {
  stats: DashboardStats;
  kpiDefs: KpiDef[];
  layouts: ResponsiveLayouts;
  editMode: boolean;
  onLayoutChange: (layout: Layout, allLayouts: ResponsiveLayouts) => void;
}

export default function DraggableKpiGrid({
  stats,
  kpiDefs,
  layouts,
  editMode,
  onLayoutChange,
}: Props) {
  const { width, containerRef } = useContainerWidth();

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {width > 0 && (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          onLayoutChange={onLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 8, md: 6, sm: 4, xs: 2, xxs: 2 }}
          rowHeight={40}
          dragConfig={{ enabled: editMode }}
          resizeConfig={{ enabled: editMode }}
          margin={[16, 16]}
          containerPadding={[16, 8]}
        >
          {kpiDefs.map((def) => {
            const value      = def.getValue(stats);
            const isDanger   = def.danger ? def.danger(stats) : false;
            const note       = def.note ? def.note(stats) : undefined;
            const valueColor = isDanger
              ? value > 3 ? '#c62828' : '#f57c00'
              : def.color;

            return (
              <div key={def.id} style={{ height: '100%' }}>
                <KpiCard
                  label={def.label}
                  icon={def.icon}
                  value={value}
                  sub={def.sub}
                  note={note}
                  valueColor={valueColor}
                  editMode={editMode}
                  href={def.href}
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
