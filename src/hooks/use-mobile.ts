import * as React from "react";

const MOBILE_BREAKPOINT = 768;

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

/** `undefined` until measured (vs `boolean` after). */
export function useIsMobileState() {
  return useMaxWidth(MOBILE_BREAKPOINT);
}

export function useGlyphCompact() {
  return !!useMaxWidth(GLYPH_COMPACT_BREAKPOINT);
}
