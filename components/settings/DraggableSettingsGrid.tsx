/**
 * @file components/settings/DraggableSettingsGrid.tsx — Responsive drag-and-drop settings panel grid
 *
 * Renders settings panel tiles in a responsive react-grid-layout grid.
 * When editMode is true, tiles can be repositioned (resizing is disabled for settings).
 * Used on the Settings page to let super admins rearrange configuration panels.
 */
'use client';

import { useCallback } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import type { Layout, ResponsiveLayouts } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

/** A single settings panel tile with an id (used as react-grid-layout key) and its content. */
export interface SettingsTileItem {
  /** Unique key matching the layout item's `i` property */
  id: string;
  /** The React content to render inside the grid tile */
  node: React.ReactNode;
}

/**
 * Props for the DraggableSettingsGrid component.
 */
interface Props {
  /** Array of settings tiles to render in the grid */
  tiles: SettingsTileItem[];
  /** Current responsive layout configuration */
  layouts: ResponsiveLayouts;
  /** When true, tiles become draggable (resize is always disabled) */
  editMode: boolean;
  /** Fired when the user repositions a tile */
  onLayoutChange: (layout: Layout, allLayouts: ResponsiveLayouts) => void;
}

/**
 * Renders settings tiles in a responsive draggable grid.
 * Resizing is intentionally disabled (resizeConfig.enabled = false) for settings panels.
 * Grid only renders after the container width is measured (> 0) to avoid layout glitches.
 */
export default function DraggableSettingsGrid({ tiles, layouts, editMode, onLayoutChange }: Props) {
  const { width, containerRef } = useContainerWidth();

  const handleLayoutChange = useCallback(
    (layout: Layout, allLayouts: ResponsiveLayouts) => {
      onLayoutChange(layout, allLayouts);
    },
    [onLayoutChange]
  );

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {width > 0 && (
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
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
