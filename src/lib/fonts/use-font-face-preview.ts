import { useEffect, useRef, useState } from "react";
import type { FilterSelection } from "@/lib/fonts/filter";
import {
  ensureFontLoaded,
  ensureFontRangeLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { opticalSizing, variationSettings } from "@/lib/fonts/preview-style";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreviewCoords } from "@/lib/fonts/use-preview-coords";
import { MOTION } from "@/lib/motion";

// Shared by FontCard and FontRow, which differ only in layout.
export function useFontFacePreview(
  font: FontRecord,
  selection: FilterSelection,
  axisValues: Record<string, number>
): {
  fontLoaded: boolean;
  previewStyle: React.CSSProperties;
  previewRef: React.RefObject<HTMLAnchorElement | null>;
} {
  const {
    weight: activeWeight,
    variationCoords,
    italic: previewItalic,
  } = usePreviewCoords(font, selection, axisValues);

  // Defer the fetch to visibility: the virtualizer's overscan mounts rows just
  // off-screen, so a fast scroll would otherwise inject a css2 <link> for every
  // row it flew past. rootMargin starts the load a little ahead of the edge so
  // a deliberate scroll-to still has the font by the time the card lands.
  const [previewRef, inView] = useInView("400px");

  // A variable font loads its full axis range once, so any pick renders from
  // the one file; a static font requests each selected cut.
  useEffect(() => {
    if (!inView) return;
    if (font.isVariable) {
      ensureFontRangeLoaded(
        font.name,
        font.axes,
        font.facets.includes("has-italic")
      );
    } else {
      ensureFontLoaded(font.name, [activeWeight]);
    }
  }, [
    inView,
    font.name,
    font.isVariable,
    font.axes,
    font.facets,
    activeWeight,
  ]);

  // Don't claim "loaded" for an off-screen card: useFontLoaded resolves true
  // for a family with no injected @font-face yet, which would swap the skeleton
  // for an unstyled preview before we ever fetch.
  const fontReady = useFontLoaded(font.name);
  const fontLoaded = inView && fontReady;
  const settings = variationSettings(variationCoords);
  const previewStyle: React.CSSProperties = {
    fontFamily: previewFontFamily(font.name, fontLoaded),
    // activeWeight already folds in the wght slider; set font-weight directly
    // (not via a coords map) so the browser can smooth/synthesize it.
    fontWeight: activeWeight,
    fontStyle: previewItalic ? "italic" : undefined,
    fontVariationSettings: settings || undefined,
    // Without this an explicit opsz coord is ignored: the browser's default
    // `auto` drives the axis from the rendered font-size instead.
    fontOpticalSizing: opticalSizing(variationCoords),
    // Opt out of the app's <html> tracking: non-zero letter-spacing suppresses
    // ligatures, and a preview must show the font as it is.
    letterSpacing: "normal",
    transition: `font-weight ${MOTION.base}ms ease, font-variation-settings ${MOTION.base}ms ease`,
  };

  return { fontLoaded, previewStyle, previewRef };
}

// Once seen it stays true: a fetched font needn't be re-fetched when the card
// scrolls back off and on. Browsers without IntersectionObserver report visible
// immediately rather than showing a permanent skeleton.
//
// A ref plus an effect, not a ref callback: the effect runs after commit when
// the node is laid out, so a hydrated card whose <a> mounts after the first
// render still gets observed.
function useInView(
  rootMargin: string
): [React.RefObject<HTMLAnchorElement | null>, boolean] {
  const ref = useRef<HTMLAnchorElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}
