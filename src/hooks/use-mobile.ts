import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// Wider breakpoint because the 16-column chart needs more room.
const GLYPH_COMPACT_BREAKPOINT = 1024;

function useMaxWidth(breakpoint: number) {
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setMatches(window.innerWidth < breakpoint);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return matches;
}

export function useIsMobile() {
  return !!useMaxWidth(MOBILE_BREAKPOINT);
}

// `undefined` until the measuring effect runs. Callers use this to tell a real
// viewport change from the first correction of the pre-hydration guess, which
// should not animate.
export function useIsMobileState() {
  return useMaxWidth(MOBILE_BREAKPOINT);
}

export function useGlyphCompact() {
  return !!useMaxWidth(GLYPH_COMPACT_BREAKPOINT);
}
