import * as React from "react";

const MOBILE_BREAKPOINT = 768;

// The glyph chart drops to its compact layout a step later than the rest of
// the app, at lg rather than md. The 16-wide address grid needs far more room
// than a sidebar toggle does: at md the detail sidebar has just returned and
// taken ~24.5rem, so a 16-column chart there squeezes each cell to a few
// pixels. Below lg the chart uses 5 packed columns and no hex address column.
const GLYPH_COMPACT_BREAKPOINT = 1024;

function useMaxWidth(breakpoint: number) {
  // Undefined until mounted, then coerced to false: the server cannot know the
  // viewport, so the first client render has to match the SSR markup.
  const [matches, setMatches] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setMatches(window.innerWidth < breakpoint);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!matches;
}

export function useIsMobile() {
  return useMaxWidth(MOBILE_BREAKPOINT);
}

// Whether the glyph chart should use its packed 5-column layout. Kept here
// beside useIsMobile so the two thresholds are visible together, and shared by
// BlockGrid and its loading skeleton — if those two disagree the chart jumps
// the moment the real grid swaps in.
export function useGlyphCompact() {
  return useMaxWidth(GLYPH_COMPACT_BREAKPOINT);
}
