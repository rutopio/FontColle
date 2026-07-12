import { useEffect, useState } from "react";

// Returns a copy of `value` that only updates after it has stayed unchanged for
// `delayMs`. A burst of rapid changes (e.g. removing several filter chips in a
// row) collapses into a single trailing update, so the expensive consumer runs
// once the input settles instead of on every intermediate change.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
