import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

export interface BlockAxes {
  coords: Record<string, number>;
  setAxis: (tag: string, value: number) => void;
}

interface BlockAxesState {
  target: BlockAxes | null;
  setTarget: (next: BlockAxes | null) => void;
}

const BlockAxesContext = createContext<BlockAxesState | null>(null);

export function BlockAxesProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<BlockAxes | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return (
    <BlockAxesContext.Provider value={value}>
      {children}
    </BlockAxesContext.Provider>
  );
}

export function useBlockAxes(): BlockAxesState | null {
  return useContext(BlockAxesContext);
}
