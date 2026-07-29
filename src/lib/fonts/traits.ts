import { isColorFont } from "./color";
import type { FilterSelection } from "./filter";
import type { FontRecord } from "./types";

export interface Trait {
  label: string;
  active: boolean;
}

export function fontTraits(
  font: FontRecord,
  selection: FilterSelection
): Trait[] {
  const traits: Trait[] = [
    {
      label: font.category,
      active: selection.categories.includes(font.category),
    },
    {
      label: font.isVariable ? "Variable" : "Static",
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
