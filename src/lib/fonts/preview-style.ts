import type { CSSProperties } from "react";
import { previewFontFamily } from "./loader";

/** Serialize axis coords into a `font-variation-settings` string, e.g.
 *  `{ wght: 700, wdth: 80 } -> '"wght" 700, "wdth" 80'`. Empty -> "". */
export function variationSettings(coords: Record<string, number>): string {
  return Object.entries(coords)
    .map(([tag, value]) => `"${tag}" ${value}`)
    .join(", ");
}

/** Shared preview styling for a family rendered at a set of axis coords. Drives
 *  the list cards, the detail tester, instance chips, and instance rows from one
 *  place. `wght` maps to `font-weight` (so browsers can synthesize/smooth it)
 *  and the rest go to `font-variation-settings`.
 *
 *  letterSpacing is reset to `normal` because the app tracks its UI wide on
 *  <html>, and any non-zero letter-spacing suppresses ligatures (spacing is
 *  inserted between the character units a ligature would otherwise join). A
 *  preview has to show the font as it really is, so it opts out. */
export function previewStyle({
  name,
  loaded,
  coords = {},
  italic = false,
}: {
  name: string;
  loaded: boolean;
  coords?: Record<string, number>;
  italic?: boolean;
}): CSSProperties {
  const settings = variationSettings(coords);
  return {
    fontFamily: previewFontFamily(name, loaded),
    fontWeight: coords.wght ? Math.round(coords.wght) : undefined,
    fontStyle: italic ? "italic" : undefined,
    fontVariationSettings: settings || undefined,
    letterSpacing: "normal",
  };
}
