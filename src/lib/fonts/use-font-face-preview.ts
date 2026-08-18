import { useEffect, useRef, useState } from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { FilterSelection } from "@/lib/fonts/filter";
import { useCoveredCharacters } from "@/lib/fonts/glyph-index";
import {
  ensureFontLoaded,
  ensureFontRangeLoaded,
  ensureTextSubsetLoaded,
  previewFontFamily,
  useFontLoaded,
  useGapSettling,
} from "@/lib/fonts/loader";
import { opticalSizing, variationSettings } from "@/lib/fonts/preview-style";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreviewCoords } from "@/lib/fonts/use-preview-coords";
import { MOTION } from "@/lib/motion";
import { usePreview } from "@/lib/preview/context";

export function useFontFacePreview(
  font: FontRecord,
  selection: FilterSelection,
  axisValues: Record<string, number>,
  previewText: string
): {
  fontLoaded: boolean;
  previewStyle: React.CSSProperties;
  previewRef: React.RefObject<HTMLAnchorElement | null>;
  /** The string the caller must paint — readiness is probed against exactly it. */
  text: string;
} {
  const {
    weight: activeWeight,
    variationCoords,
    italic: previewItalic,
  } = usePreviewCoords(font, selection, axisValues);

  const { coverOnly } = usePreview();
  const [previewRef, inView] = useInView("400px", font, activeWeight);

  const text = previewText || specimenFor(font);

  const fontReady = useFontLoaded(font.name, activeWeight, text);

  const covered = useCoveredCharacters(font.id, text);
  useEffect(() => {
    if (!inView) return;
    return ensureTextSubsetLoaded(font.name, covered);
  }, [inView, font.name, covered]);
  // Hold the reveal until the gap pass settles, otherwise the first paint shows
  // only the clusters the default subsets happen to cover and the rest pop in.
  const gapSettling = useGapSettling(font.name);
  const fontLoaded = inView && fontReady && !gapSettling;
  const settings = variationSettings(variationCoords);
  const previewStyle: React.CSSProperties = {
    fontFamily: previewFontFamily(font.name, !coverOnly),
    fontWeight: activeWeight,
    fontStyle: previewItalic ? "italic" : undefined,
    fontVariationSettings: settings || undefined,
    fontOpticalSizing: opticalSizing(variationCoords),
    letterSpacing: "normal",
    transition: `font-weight ${MOTION.base}ms ease, font-variation-settings ${MOTION.base}ms ease`,
  };

  return { fontLoaded, previewStyle, previewRef, text };
}

function useInView(
  rootMargin: string,
  font: FontRecord,
  activeWeight: number
): [React.RefObject<HTMLAnchorElement | null>, boolean] {
  const ref = useRef<HTMLAnchorElement>(null);
  const [inView, setInView] = useState(false);
  const fontRef = useRef(font);
  fontRef.current = font;
  const activeWeightRef = useRef(activeWeight);
  activeWeightRef.current = activeWeight;

  useMountEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      loadFont(fontRef.current, activeWeightRef.current);
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadFont(fontRef.current, activeWeightRef.current);
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  });

  // Must pass the italic flag too: whichever request lands first claims the
  // family in `loaded`, so a roman-only request here would suppress the
  // italic one in loadFont and leave the preview on a synthesised slant.
  const hasItalic = font.facets.includes("has-italic");
  useEffect(() => {
    if (!inView || font.isVariable) return;
    ensureFontLoaded(font.name, [activeWeight], hasItalic);
  }, [inView, activeWeight, font.isVariable, font.name, hasItalic]);

  return [ref, inView];
}

function loadFont(font: FontRecord, activeWeight: number) {
  const hasItalic = font.facets.includes("has-italic");
  if (font.isVariable) {
    ensureFontRangeLoaded(font.name, font.axes, hasItalic);
  } else {
    // Static families ship italic as its own file, so it has to be requested
    // explicitly — without this the Italic filter previewed a synthesised
    // slant on the 164 static families that have a real italic.
    ensureFontLoaded(font.name, [activeWeight], hasItalic);
  }
}
