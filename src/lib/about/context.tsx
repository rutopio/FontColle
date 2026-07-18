import { createContext, type ReactNode, useContext, useState } from "react";

interface AboutState {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const AboutContext = createContext<AboutState | null>(null);

// Whether the About dialog is showing. It lives in context rather than in the
// URL so opening it never changes the matched route: the page underneath stays
// mounted and its icon rail (the list's filter groups, or a font's tab switcher)
// is left exactly as it was. The trade is that About has no shareable URL, which
// is the right call for a couple of paragraphs of colophon.
export function AboutProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // `open` changes on every toggle, so a useMemo here would rebuild the object
  // just as often as the plain literal it replaces.
  return (
    <AboutContext.Provider value={{ open, setOpen }}>
      {children}
    </AboutContext.Provider>
  );
}

export function useAbout(): AboutState {
  const ctx = useContext(AboutContext);
  if (!ctx) {
    throw new Error("useAbout must be used within an AboutProvider");
  }
  return ctx;
}
