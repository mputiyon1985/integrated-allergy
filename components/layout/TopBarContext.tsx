import { createContext, useContext } from 'react';

interface TopBarContextValue {
  onMenuClick: () => void;
}

const TopBarContext = createContext<TopBarContextValue>({ onMenuClick: () => {} });

export default TopBarContext;

export function useTopBarContext() {
  return useContext(TopBarContext);
}
