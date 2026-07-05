import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { emptyFilter, type FilterState } from "@/lib/fonts/filter";

interface FilterState_ {
  filter: FilterState;
  setFilter: (next: FilterState) => void;
}

const FilterContext = createContext<FilterState_ | null>(null);

// Shares the active filter across the app, mirroring PreviewProvider. The list
// page keeps this in sync with its URL (the source of truth for sharable
// links); the detail page reads it so its sidebar reflects what's selected,
// even though the detail URL carries no filter params.
export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<FilterState>(emptyFilter);
  const value = useMemo(() => ({ filter, setFilter }), [filter]);
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
