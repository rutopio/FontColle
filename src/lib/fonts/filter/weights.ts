// Weight/width step tables and the per-family coverage sets derived from them.
import type { FontRecord } from "../types";

// Standard weight steps we expose as pills. Mirrors the harvester's snapping.
export const WEIGHT_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

// Human labels for the weight pills.
export const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
};

// usWidthClass steps (1..9) and their nominal percentage, used to map a variable
// wdth axis range (expressed in percent) onto the discrete width pills.
export const WIDTH_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// Plain Condensed/Expanded/Normal stay spelled out; the compound widths are
// abbreviated (Cond./Expd.) so they fit the small width pills.
export const WIDTH_LABELS: Record<number, string> = {
  1: "Ultra Cond.",
  2: "Extra Cond.",
  3: "Condensed",
  4: "Semi Cond.",
  5: "Normal",
  6: "Semi Expd.",
  7: "Expanded",
  8: "Extra Expd.",
  9: "Ultra Expd.",
};
export const WIDTH_STEP_PCT: Record<number, number> = {
  1: 50,
  2: 62.5,
  3: 75,
  4: 87.5,
  5: 100,
  6: 112.5,
  7: 125,
  8: 150,
  9: 200,
};

/** Standard weight steps a family offers (already derived in the dataset). */
export function familyWeightSet(font: FontRecord): number[] {
  if (font.weights.length) return font.weights;
  // Fallback for records without a derived list: snap the primary weightClass.
  const wc = font.weightClass;
  if (wc == null) return [];
  const nearest = WEIGHT_STEPS.reduce((best, s) =>
    Math.abs(s - wc) < Math.abs(best - wc) ? s : best
  );
  return [nearest];
}

/** usWidthClass steps a family covers: its static width, plus wdth-axis range. */
export function familyWidthSet(font: FontRecord): number[] {
  const steps = new Set<number>();
  const wdth = font.axes.find((a) => a.tag === "wdth");
  if (wdth && wdth.min != null && wdth.max != null) {
    for (const step of WIDTH_STEPS) {
      const pct = WIDTH_STEP_PCT[step];
      if (pct >= wdth.min && pct <= wdth.max) steps.add(step);
    }
  }
  // Static width (or the variable's default width class) as a discrete bucket.
  if (font.widthClass != null && font.widthClass >= 1 && font.widthClass <= 9) {
    steps.add(font.widthClass);
  }
  return [...steps].sort((a, b) => a - b);
}
