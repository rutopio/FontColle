import type { CSSProperties } from "react";
import { previewFontFamily } from "./loader";

export function variationSettings(coords: Record<string, number>): string {
  return Object.entries(coords)
    .map(([tag, value]) => `"${tag}" ${value}`)
    .join(", ");
}

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
    fontOpticalSizing: opticalSizing(coords),
    letterSpacing: "normal",
  };
}

/** `none` when an explicit opsz coord is set, so it isn't overridden by auto. */
export function opticalSizing(coords: Record<string, number>): "auto" | "none" {
  return "opsz" in coords ? "none" : "auto";
}
