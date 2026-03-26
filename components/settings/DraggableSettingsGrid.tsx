'use client';

import { useCallback } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

export interface SettingsTileItem {
  id: string;
  node: React.ReactNode;
}

interface Props {
  tiles: SettingsTileItem[];
  layouts: Record<string, unknown[]>;
  editMode: boolean;
  onLayoutChange: (layout: unknown, allLayouts: Record<string, unknown[]>) => void;
}

export default function DraggableSettingsGrid({ tiles, layouts, editMode, onLayoutChange }: Props) {
  const { width, containerRef } = useContainerWidth();

  const handleLayoutChange = useCallback(
    (layout: unknown, allLayouts: unknown) => {
      onLayoutChange(layout, allLayouts as Record<string, unknown[]>);
    },
    [onLayoutChange]
  );

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {width > 0 && (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts as any}
          onLayoutChange={handleLayoutChange as any}
          breakpoints={{ lg: 1200, md: 900, sm: 600, xs: 0 }}
          cols={{ lg: 3, md: 2, sm: 2, xs: 1 }}
          rowHeight={48}
          dragConfig={{ enabled: editMode }}
          resizeConfig={{ enabled: false }}
          margin={[16, 16]}
          containerPadding={[0, 0]}
        >
          {tiles.map((tile) => (
            <div key={tile.id} style={{ height: '100%', overflow: 'visible' }}>
              {tile.node}
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
