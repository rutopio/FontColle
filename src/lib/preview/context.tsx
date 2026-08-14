import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

/** Preview type size in px. Shared by the catalog list and the detail tester. */
export const SIZE_MIN = 12;
export const SIZE_MAX = 72;
export const SIZE_DEFAULT = 24;
export const SIZE_PRESETS = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 52, 60, 72,
];

const clampSize = (v: number) =>
  Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(v)));

interface PreviewState {
  text: string;
  setText: (v: string) => void;
  /** Hide fonts that cannot render the preview text. On unless switched off. */
  coverOnly: boolean;
  setCoverOnly: (v: boolean) => void;
  size: number;
  setSize: (v: number) => void;
}

const PreviewContext = createContext<PreviewState | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useLocalStorageState("font-fridge.preview-text", "");
  const [cover, setCover] = useLocalStorageState(
    "font-fridge.preview-cover-only",
    "1"
  );
  const [size, setSizeRaw] = useLocalStorageState(
    "font-fridge.preview-size",
    String(SIZE_DEFAULT)
  );
  const value = useMemo(() => {
    const parsed = Number(size);
    return {
      text,
      setText,
      coverOnly: cover !== "0",
      setCoverOnly: (v: boolean) => setCover(v ? "1" : "0"),
      size: Number.isFinite(parsed) ? clampSize(parsed) : SIZE_DEFAULT,
      setSize: (v: number) => setSizeRaw(String(clampSize(v))),
    };
  }, [text, setText, cover, setCover, size, setSizeRaw]);
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
