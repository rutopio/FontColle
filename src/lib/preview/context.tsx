import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

interface PreviewState {
  text: string;
  setText: (v: string) => void;
}

const PreviewContext = createContext<PreviewState | null>(null);

// Shared preview text across the whole app (list grid, detail tester, dock),
// so typing in the dock updates every preview surface at once.
export function PreviewProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState("");
  const value = useMemo(() => ({ text, setText }), [text]);
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
