import { useCallback, useEffect, useState } from "react";

// A useState-shaped hook backed by localStorage, for personal-device
// preferences that should survive reloads but must never leak into a shared
// URL (view mode, preview text, …). SSR-safe: renders `initial` on the server
// and on the first client paint, then hydrates the stored value in an effect,
// so it never touches localStorage during render. Writes are best-effort and
// swallow quota / private-mode errors, matching useFavorites.
export function useLocalStorageState(
  key: string,
  initial: string
): [string, (v: string) => void] {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(raw);
    } catch {
      // ignore private-mode read errors
    }
  }, [key]);

  const set = useCallback(
    (v: string) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        // ignore quota / private-mode errors
      }
    },
    [key]
  );

  return [value, set];
}
