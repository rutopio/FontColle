import { useMemo } from "react";
import { type FilterSelection, WIDTH_STEP_PCT } from "./filter";
import type { FontRecord } from "./types";

// The preview state a filter selection implies for one family: the weight to
// render at and any other variation coords (width, extra axes). Shared by the
// grid card and the list row so both preview the sidebar's Weight/Width/axis
// picks identically.
export interface PreviewCoords {
  // font-weight to apply (from the selected weight step or the wght slider).
  weight: number;
  // Non-weight variation coords (wdth and any other selected axes).
  variationCoords: Record<string, number>;
}

/** Derive the preview weight + variation coords a FilterSelection implies for a
 *  given font. Weight/Width are single-select steps; axisValues holds the live
 *  0-100% slider position per selected variable axis, mapped onto this font's
 *  own axis range (ranges differ per font). The wght slider and wdth slider
 *  override the Weight/Width step selections when both are in play. */
export function usePreviewCoords(
  font: FontRecord,
  selection: FilterSelection,
  axisValues: Record<string, number>
): PreviewCoords {
  const selectedWeights = selection.weights;
  const selectedWidths = selection.widths;
  const selectedAxes = selection.axes;

  const activeWeight = Number(selectedWeights[0]) || 400;

  const widthCoord = useMemo(() => {
    const wdth = font.axes.find((a) => a.tag === "wdth");
    if (!wdth || wdth.min == null || wdth.max == null) return null;
    const step = Number(selectedWidths[0]);
    if (!selectedWidths[0]) return null;
    const pct = WIDTH_STEP_PCT[step];
    if (pct == null) return null;
    return Math.min(wdth.max, Math.max(wdth.min, pct));
  }, [font.axes, selectedWidths]);

  const { axisWeight, variationCoords } = useMemo(() => {
    let weight: number | null = null;
    const coords: Record<string, number> = {};
    for (const tag of selectedAxes) {
      const axis = font.axes.find((a) => a.tag === tag);
      if (!axis || axis.min == null || axis.max == null) continue;
      const pct = axisValues[tag] ?? 50;
      const value = axis.min + ((axis.max - axis.min) * pct) / 100;
      if (tag === "wght") weight = value;
      else coords[tag] = value;
    }
    return { axisWeight: weight, variationCoords: coords };
  }, [font.axes, selectedAxes, axisValues]);

  // The wdth slider (in variationCoords) is the more explicit control, so it
  // wins over the Width-step coord when both are set.
  if (widthCoord != null && !("wdth" in variationCoords)) {
    variationCoords.wdth = widthCoord;
  }

  return { weight: axisWeight ?? activeWeight, variationCoords };
}
