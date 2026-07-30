import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

/** What the tester publishes about the block the caret is in, so the axis
 *  sliders in the sidebar can drive it. `coords` is the block's current axis
 *  values (empty when the block carries no instance style of its own);
 *  `setAxis` writes one axis back into that block. Null means no block is
 *  selected, and the sliders disable themselves. */
export interface BlockAxes {
  coords: Record<string, number>;
  setAxis: (tag: string, value: number) => void;
}

interface BlockAxesState {
  target: BlockAxes | null;
  setTarget: (next: BlockAxes | null) => void;
}

const BlockAxesContext = createContext<BlockAxesState | null>(null);

/** Mounted above both the tester and the sidebar. The tester is the only
 *  writer; the sidebar is the only reader. */
export function BlockAxesProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<BlockAxes | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return (
    <BlockAxesContext.Provider value={value}>
      {children}
    </BlockAxesContext.Provider>
  );
}

/** Null outside a provider, so surfaces that never mount the tester (the
 *  glyphs sidebar, the sample tab) keep working untouched. */
export function useBlockAxes(): BlockAxesState | null {
  return useContext(BlockAxesContext);
}
