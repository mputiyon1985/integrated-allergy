/**
 * @file components/layout/TopBarContext.tsx — Context for mobile menu trigger
 *
 * Provides the `onMenuClick` handler from ClientLayout down to TopBar without
 * prop drilling through every page component. Pages import TopBar directly;
 * the menu trigger is injected via this context.
 */
import { createContext, useContext } from 'react';

/** Context value shape for the top bar menu trigger. */
interface TopBarContextValue {
  /** Called when the mobile hamburger button is clicked to open the sidebar */
  onMenuClick: () => void;
}

/** Default no-op context — overridden by ClientLayout's Provider. */
const TopBarContext = createContext<TopBarContextValue>({ onMenuClick: () => {} });

export default TopBarContext;

/**
 * Hook to access the TopBarContext value.
 * Used by TopBar to get the mobile menu click handler from ClientLayout.
 */
export function useTopBarContext() {
  return useContext(TopBarContext);
}
