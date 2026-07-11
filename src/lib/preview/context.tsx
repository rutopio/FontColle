import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

interface PreviewState {
  text: string;
  setText: (v: string) => void;
}

const PreviewContext = createContext<PreviewState | null>(null);

// Shared preview text across the whole app (list grid, detail tester, dock),
// so typing in the dock updates every preview surface at once. Persisted to
// localStorage so a phrase the user typed sticks across reloads; it's a
// personal-device preference, not part of a shareable URL.
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useLocalStorageState("font-finder.preview-text", "");
  // setText is a stable useCallback from useLocalStorageState, so listing it
  // keeps the exhaustive-deps rule happy without extra recomputes.
  const value = useMemo(() => ({ text, setText }), [text, setText]);
  return (
    <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
  );
}

export function usePreview(): PreviewState {
  const ctx = useContext(PreviewContext);
  if (!ctx) {
    throw new Error("usePreview must be used within a PreviewProvider");
  }
  return ctx;
}
