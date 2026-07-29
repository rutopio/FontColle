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

  const [previewRef, inView] = useInView("400px");

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

  const fontReady = useFontLoaded(font.name, activeWeight);
  const fontLoaded = inView && fontReady;
  const settings = variationSettings(variationCoords);
  const previewStyle: React.CSSProperties = {
    fontFamily: previewFontFamily(font.name, fontLoaded),
    fontWeight: activeWeight,
    fontStyle: previewItalic ? "italic" : undefined,
    fontVariationSettings: settings || undefined,
    fontOpticalSizing: opticalSizing(variationCoords),
    letterSpacing: "normal",
    transition: `font-weight ${MOTION.base}ms ease, font-variation-settings ${MOTION.base}ms ease`,
  };

  return { fontLoaded, previewStyle, previewRef };
}

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
