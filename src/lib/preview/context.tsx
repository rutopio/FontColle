import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

interface PreviewState {
  text: string;
  setText: (v: string) => void;
  /** Hide fonts that cannot render the preview text. On unless switched off. */
  coverOnly: boolean;
  setCoverOnly: (v: boolean) => void;
}

const PreviewContext = createContext<PreviewState | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useLocalStorageState("font-colle.preview-text", "");
  const [cover, setCover] = useLocalStorageState(
    "font-colle.preview-cover-only",
    "1"
  );
  const value = useMemo(
    () => ({
      text,
      setText,
      coverOnly: cover !== "0",
      setCoverOnly: (v: boolean) => setCover(v ? "1" : "0"),
    }),
    [text, setText, cover, setCover]
  );
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
