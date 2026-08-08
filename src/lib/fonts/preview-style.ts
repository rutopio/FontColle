import type { CSSProperties } from "react";
import { previewFontFamily } from "./loader";

export function variationSettings(coords: Record<string, number>): string {
  return Object.entries(coords)
    .map(([tag, value]) => `"${tag}" ${value}`)
    .join(", ");
}

export function previewStyle({
  name,
  showNotdef = false,
  coords = {},
  italic = false,
}: {
  name: string;
  showNotdef?: boolean;
  coords?: Record<string, number>;
  italic?: boolean;
}): CSSProperties {
  const settings = variationSettings(coords);
  return {
    fontFamily: previewFontFamily(name, showNotdef),
    fontWeight: coords.wght ? Math.round(coords.wght) : undefined,
    fontStyle: italic ? "italic" : undefined,
    fontVariationSettings: settings || undefined,
    fontOpticalSizing: opticalSizing(coords),
    letterSpacing: "normal",
  };
}

export function opticalSizing(coords: Record<string, number>): "auto" | "none" {
  return "opsz" in coords ? "none" : "auto";
}
