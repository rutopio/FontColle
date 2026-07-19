import { useEffect } from "react";
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
): { fontLoaded: boolean; previewStyle: React.CSSProperties } {
  // Weight/width/axis picks from the sidebar drive the live preview.
  const {
    weight: activeWeight,
    variationCoords,
    italic: previewItalic,
  } = usePreviewCoords(font, selection, axisValues);

  // Variable fonts: load the full axis range once so any weight/width the user
  // picks renders from a single variable file. Static fonts: request the actual
  // selected weight cut (appended on each switch) so it doesn't stay on an old
  // one for lack of that file.
  useEffect(() => {
    if (font.isVariable) {
      ensureFontRangeLoaded(
        font.name,
        font.axes,
        font.facets.includes("has-italic")
      );
    } else {
      ensureFontLoaded(font.name, [activeWeight]);
    }
  }, [font.name, font.isVariable, font.axes, font.facets, activeWeight]);

  const fontLoaded = useFontLoaded(font.name);
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

  return { fontLoaded, previewStyle };
}
