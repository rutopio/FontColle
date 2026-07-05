import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { emptyFilter, type FilterState } from "@/lib/fonts/filter";

interface FilterState_ {
  filter: FilterState;
  setFilter: (next: FilterState) => void;
  // Last known list scroll position. A ref (not state) because it's read/written
  // imperatively around navigation and must never trigger a re-render. Restoring
  // it manually is more reliable than router scrollRestoration for the window
  // virtualizer, whose total height isn't final on the first frame back.
  listScrollY: React.RefObject<number>;
}

const FilterContext = createContext<FilterState_ | null>(null);

// Shares the active filter across the app, mirroring PreviewProvider. The list
// page keeps this in sync with its URL (the source of truth for sharable
// links); the detail page reads it so its sidebar reflects what's selected,
// even though the detail URL carries no filter params.
export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>(emptyFilter);
  const listScrollY = useRef(0);
  const value = useMemo(() => ({ filter, setFilter, listScrollY }), [filter]);
  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilter(): FilterState_ {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return ctx;
}
