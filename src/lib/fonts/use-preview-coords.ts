import { useMemo } from "react";
import { type FilterSelection, WIDTH_STEP_PCT } from "./filter";
import type { FontRecord } from "./types";

export interface PreviewCoords {
  weight: number;
  variationCoords: Record<string, number>;
  // Only the "italic" pick turns this on; "upright" and no pick leave it off.
  italic: boolean;
}

/** `axisValues` is a 0-100% position per axis, mapped onto this font's own
 *  range. The wght/wdth sliders override the Weight/Width steps.
 *
 *  Renders the LAST-clicked step, the tail of the array, since toggle appends:
 *  clicking Light -> Bold -> Regular previews each in turn even though all
 *  three stay in the filter. */
export function usePreviewCoords(
  font: FontRecord,
  selection: FilterSelection,
  axisValues: Record<string, number>
): PreviewCoords {
  const selectedWeights = selection.weights;
  const selectedWidths = selection.widths;
  const selectedAxes = selection.axes;

  const activeWeight = Number(selectedWeights.at(-1)) || 400;

  const widthCoord = useMemo(() => {
    const wdth = font.axes.find((a) => a.tag === "wdth");
    if (!wdth || wdth.min == null || wdth.max == null) return null;
    const last = selectedWidths.at(-1);
    const step = Number(last);
    if (!last) return null;
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

  const italic = selection.italic.includes("italic");

  return { weight: axisWeight ?? activeWeight, variationCoords, italic };
}
