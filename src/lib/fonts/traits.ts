import { isColorFont } from "./color";
import type { FilterSelection } from "./filter";
import type { FontRecord } from "./types";

// A footer trait badge: a label plus whether the active filter selected it (so
// the badge renders highlighted). Shared by the list card and row.
export interface Trait {
  label: string;
  active: boolean;
}

/** The trait badges for a font, category, variable/static, color, and feature
 *  count, flagging which ones the current filter selection matches. */
export function fontTraits(
  font: FontRecord,
  selection: FilterSelection
): Trait[] {
  const traits: Trait[] = [
    { label: font.class, active: selection.classes.includes(font.class) },
    {
      label: font.isVariable ? "Variable" : "Static",
      // A selected variable axis is inherently a "variable" filter, so it also
      // lights up the Variable badge.
      active: font.isVariable
        ? selection.tags.includes("variable") || selection.axes.length > 0
        : selection.tags.includes("static"),
    },
    {
      label: isColorFont(font) ? "Colorful" : "Monochrome",
      active: selection.color.includes(
        isColorFont(font) ? "color" : "monochrome"
      ),
    },
  ];
  if (font.features.length > 0) {
    const n = font.features.length;
    traits.push({ label: `${n} feature${n > 1 ? "s" : ""}`, active: false });
  }
  return traits;
}
