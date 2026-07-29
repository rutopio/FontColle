import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

interface PreviewState {
  text: string;
  setText: (v: string) => void;
}

const PreviewContext = createContext<PreviewState | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useLocalStorageState("font-colle.preview-text", "");
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
