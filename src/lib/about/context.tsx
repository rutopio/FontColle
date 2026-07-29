import { createContext, type ReactNode, useContext, useState } from "react";

interface AboutState {
  open: boolean;
  setOpen: (v: boolean) => void;
}

const AboutContext = createContext<AboutState | null>(null);

export function AboutProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
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
