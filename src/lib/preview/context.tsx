import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { useIsMobileState } from "@/hooks/use-mobile";

/** Preview type size in px. Shared by the catalog list and the detail tester. */
export const SIZE_MIN = 12;
export const SIZE_MAX = 72;
export const SIZE_DEFAULT = 24;
export const SIZE_PRESETS = [
  12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 52, 60, 72,
];

/**
 * Preview leading as a percentage of each view's own baseline leading, so 100
 * keeps the list exactly as it was before this control existed.
 */
export const LEADING_MIN = 70;
export const LEADING_MAX = 250;
export const LEADING_DEFAULT = 100;
export const LEADING_PRESETS = [
  80, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 250,
];

const clampSize = (v: number) =>
  Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(v)));

const clampLeading = (v: number) =>
  Math.min(LEADING_MAX, Math.max(LEADING_MIN, Math.round(v)));

interface PreviewState {
  text: string;
  setText: (v: string) => void;
  /** Hide fonts that cannot render the preview text. On unless switched off. */
  coverOnly: boolean;
  setCoverOnly: (v: boolean) => void;
  /**
   * Show the preview size/leading controls. Tracked per form factor: the
   * desktop rail has room for them so they are on unless switched off, while
   * the mobile drawer trades that height for filters so they start off.
   */
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  size: number;
  setSize: (v: number) => void;
  leading: number;
  setLeading: (v: number) => void;
}

const PreviewContext = createContext<PreviewState | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useLocalStorageState("font-fridge.preview-text", "");
  const [cover, setCover] = useLocalStorageState(
    "font-fridge.preview-cover-only",
    "1"
  );
  const [preview, setPreview] = useLocalStorageState(
    "font-fridge.preview-controls",
    "1"
  );
  const [previewMobile, setPreviewMobile] = useLocalStorageState(
    "font-fridge.preview-controls-mobile",
    "0"
  );
  // `undefined` until measured — fall back to the desktop key, which is what
  // the rail (the only preview toggle painted before measurement) reads.
  const isMobile = useIsMobileState() === true;
  const [size, setSizeRaw] = useLocalStorageState(
    "font-fridge.preview-size",
    String(SIZE_DEFAULT)
  );
  const [leading, setLeadingRaw] = useLocalStorageState(
    "font-fridge.preview-leading",
    String(LEADING_DEFAULT)
  );
  const value = useMemo(() => {
    const parsed = Number(size);
    const parsedLeading = Number(leading);
    return {
      text,
      setText,
      coverOnly: cover !== "0",
      setCoverOnly: (v: boolean) => setCover(v ? "1" : "0"),
      showPreview: (isMobile ? previewMobile : preview) !== "0",
      setShowPreview: (v: boolean) =>
        (isMobile ? setPreviewMobile : setPreview)(v ? "1" : "0"),
      size: Number.isFinite(parsed) ? clampSize(parsed) : SIZE_DEFAULT,
      setSize: (v: number) => setSizeRaw(String(clampSize(v))),
      leading: Number.isFinite(parsedLeading)
        ? clampLeading(parsedLeading)
        : LEADING_DEFAULT,
      setLeading: (v: number) => setLeadingRaw(String(clampLeading(v))),
    };
  }, [
    text,
    setText,
    cover,
    setCover,
    preview,
    setPreview,
    previewMobile,
    setPreviewMobile,
    isMobile,
    size,
    setSizeRaw,
    leading,
    setLeadingRaw,
  ]);
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
