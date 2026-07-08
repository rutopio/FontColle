import { DownloadSimpleIcon, HeartIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { FontTraits } from "@/components/font-traits";
import { type FilterSelection, WIDTH_STEP_PCT } from "@/lib/fonts/filter";
import {
  ensureFontLoaded,
  ensureFontRangeLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { variationSettings } from "@/lib/fonts/preview-style";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

interface Props {
  font: FontRecord;
  previewText: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  // Active filter slice — drives both the live preview (weight/width/axes) and
  // which trait badges render highlighted.
  selection: FilterSelection;
  // Session slider positions (0-100%) per selected variable axis. Not part of
  // the filter: each font maps the percent onto its own axis range for preview.
  axisValues: Record<string, number>;
}

export function FontCard({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selection,
  axisValues,
}: Props) {
  const selectedWeights = selection.weights.map(Number);
  const selectedWidths = selection.widths.map(Number);
  const selectedAxes = selection.axes;
  // Weight/Width are single-select in the sidebar, so the preview simply applies
  // the selected weight (default 400) and the selected width mapped onto this
  // font's wdth axis (variable only — static fonts have no adjustable width).
  const activeWeight = selectedWeights[0] ?? 400;

  const widthCoord = useMemo(() => {
    const wdth = font.axes.find((a) => a.tag === "wdth");
    if (!wdth || wdth.min == null || wdth.max == null) return null;
    const step = selectedWidths[0];
    if (step == null) return null;
    const pct = WIDTH_STEP_PCT[step];
    if (pct == null) return null;
    return Math.min(wdth.max, Math.max(wdth.min, pct));
  }, [font.axes, selectedWidths]);

  // Variable-axes sliders: map each selected axis's 0-100% onto this font's own
  // min-max range (ranges differ per font, e.g. wght 100-900 vs 300-700), so
  // the same slider position always means "this far across what this font
  // offers." wght drives font-weight directly instead of a variation setting,
  // matching how `activeWeight` already works. wdth here overrides the
  // Width-card coord above when both are in play (the slider is the more
  // explicit, live-adjusted control).
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

  if (widthCoord != null && !("wdth" in variationCoords)) {
    variationCoords.wdth = widthCoord;
  }

  // Variable fonts: load the full axis range once so any weight/width the user
  // picks renders from a single variable file. Static fonts: request the actual
  // selected weight cut (appended on each switch) so it doesn't stay on an old
  // one for lack of that file.
  useEffect(() => {
    if (font.isVariable) {
      ensureFontRangeLoaded(font.name, font.axes);
    } else {
      ensureFontLoaded(font.name, [activeWeight]);
    }
  }, [font.name, font.isVariable, font.axes, activeWeight]);

  const fontLoaded = useFontLoaded(font.name);
  const settings = variationSettings(variationCoords);
  const previewStyle: React.CSSProperties = {
    fontFamily: previewFontFamily(font.name, fontLoaded),
    // The card drives weight from the sidebar (activeWeight) or the wght slider
    // (axisWeight), not from a coords map, so it sets font-weight directly.
    fontWeight: axisWeight ?? activeWeight,
    fontVariationSettings: settings || undefined,
    // Smooth the weight/axis change instead of a hard jump.
    transition: "font-weight 200ms ease, font-variation-settings 200ms ease",
  };

  return (
    <Link
      to="/$fontId"
      params={{ fontId: font.id }}
      className="flex h-72 flex-col gap-4 overflow-hidden rounded-lg border bg-card p-5 transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h3 className="truncate font-medium text-sm">{font.name}</h3>
          {font.designer && (
            <p className="truncate text-muted-foreground text-xs">
              {font.designer}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(font.id);
            }}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <HeartIcon
              weight={isFavorite ? "fill" : "regular"}
              className={cn("size-5", isFavorite && "text-red-500")}
            />
          </button>
          {/* A button, not an <a>: the whole card is already a <Link> (an
              <a>), and <a> can't nest <a> (hydration error). Open Google Fonts
              in a new tab and stop the click from triggering card navigation. */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(
                `https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`,
                "_blank",
                "noreferrer"
              );
            }}
            aria-label="Download on Google Fonts"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <DownloadSimpleIcon className="size-5" />
          </button>
        </div>
      </div>

      {fontLoaded ? (
        <p
          // Let the browser derive writing direction from the text so RTL
          // scripts (Hebrew, Arabic) render right-to-left, LTR otherwise.
          dir="auto"
          style={previewStyle}
          className="min-h-16 flex-1 overflow-hidden break-words text-2xl leading-snug"
        >
          {previewText || specimenFor(font)}
        </p>
      ) : (
        // Skeleton while the web font is still loading, so the card shows a
        // steady placeholder instead of an empty/blank preview area.
        <div className="flex min-h-16 flex-1 flex-col gap-2.5 py-1" aria-hidden>
          <div className="h-4 w-[85%] animate-pulse rounded bg-muted" />
          <div className="h-4 w-[70%] animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <FontTraits font={font} selection={selection} />
      </div>
    </Link>
  );
}
