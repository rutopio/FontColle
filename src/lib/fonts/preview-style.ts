import type { CSSProperties } from "react";
import { previewFontFamily } from "./loader";

export function variationSettings(coords: Record<string, number>): string {
  return Object.entries(coords)
    .map(([tag, value]) => `"${tag}" ${value}`)
    .join(", ");
}

/** `wght` maps to `font-weight`, so browsers can synthesize and smooth it; the
 *  rest go to `font-variation-settings`.
 *
 *  letterSpacing resets to `normal`: the app tracks its UI wide on <html>, and
 *  non-zero letter-spacing suppresses ligatures. */
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
    // See opticalSizing: an explicit opsz coord is inert under the default.
    fontOpticalSizing: opticalSizing(coords),
    letterSpacing: "normal",
  };
}

/** Browsers default `font-optical-sizing` to `auto`, which ties the `opsz` axis
 *  to the rendered font-size and silently overrides any `opsz` in
 *  `font-variation-settings`. `none` hands the axis back to an explicit coord;
 *  otherwise `auto` stays, being the right default. */
export function opticalSizing(coords: Record<string, number>): "auto" | "none" {
  return "opsz" in coords ? "none" : "auto";
}
