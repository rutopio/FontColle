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

// Shared preview wiring for FontCard and FontRow: derives the live weight/
// width/axis coords from the sidebar selection, ensures the right font file is
// loaded, and returns the load flag plus a ready-to-spread CSS style. The two
// components differ only in layout, so this keeps the font-loading effect and
// the preview style in exactly one place.
export function useFontFacePreview(
  font: FontRecord,
  selection: FilterSelection,
  axisValues: Record<string, number>
): {
  fontLoaded: boolean;
  previewStyle: React.CSSProperties;
  previewRef: React.RefObject<HTMLAnchorElement | null>;
} {
  // Weight/width/axis picks from the sidebar drive the live preview.
  const {
    weight: activeWeight,
    variationCoords,
    italic: previewItalic,
  } = usePreviewCoords(font, selection, axisValues);

  // A card only fetches its web font once it actually enters (or nears) the
  // viewport. The virtualizer's overscan mounts rows just off-screen, and a fast
  // scroll used to mount and immediately fetch every row it flew past — hundreds
  // of css2 <link>s injected inside the scroll. IntersectionObserver defers the
  // fetch to visibility, so a row scrolled through before it settles never
  // fetches. rootMargin starts the load a little ahead of the edge so a
  // deliberate scroll-to still has the font by the time the card lands.
  const [previewRef, inView] = useInView("400px");

  // Variable fonts: load the full axis range once so any weight/width the user
  // picks renders from a single variable file. Static fonts: request the actual
  // selected weight cut (appended on each switch) so it doesn't stay on an old
  // one for lack of that file.
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

  // Don't claim "loaded" for an off-screen card: useFontLoaded's direct
  // load(probe) resolves true for a family with no injected @font-face yet,
  // which would swap the skeleton for an unstyled preview before we ever fetch.
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
    // ligatures, and a preview must show the font as it is. See previewStyle
    // in ./preview-style for the full reasoning.
    letterSpacing: "normal",
    // Smooth the weight/axis change instead of a hard jump.
    transition: `font-weight ${MOTION.base}ms ease, font-variation-settings ${MOTION.base}ms ease`,
  };

  return { fontLoaded, previewStyle, previewRef };
}

// Observe a single element and report whether it has entered the viewport. Once
// seen it stays true: a font, once fetched, doesn't need to be re-fetched when
// the card scrolls back off and on. `rootMargin` grows the trigger box so the
// load starts slightly before the element is actually visible. Browsers without
// IntersectionObserver report visible immediately, preserving the old
// load-on-mount behaviour rather than showing a permanent skeleton.
//
// A stable element ref plus an effect (rather than a ref callback) is used
// deliberately: the effect runs after commit when the node is laid out, and
// re-observes if `node` changes, so a hydrated card whose <a> mounts after the
// first render still gets observed.
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
