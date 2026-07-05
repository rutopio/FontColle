import { DownloadSimpleIcon, HeartIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { WIDTH_STEP_PCT } from "@/lib/fonts/filter";
import {
  ensureFontLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

interface Props {
  font: FontRecord;
  previewText: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  // Sidebar-selected weight/width (single-select, so at most one each). The
  // preview applies them (pain point 4 driven from the filter).
  selectedWeights: number[];
  selectedWidths: number[];
}

export function FontCard({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selectedWeights,
  selectedWidths,
}: Props) {
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

  useEffect(() => {
    ensureFontLoaded(font.name, [activeWeight]);
  }, [font.name, activeWeight]);

  const fontLoaded = useFontLoaded(font.name);
  const previewStyle: React.CSSProperties = {
    fontFamily: previewFontFamily(font.name, fontLoaded),
    fontWeight: activeWeight,
    fontVariationSettings:
      widthCoord != null ? `"wdth" ${widthCoord}` : undefined,
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
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-sm">{font.name}</h3>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {font.class}
            </Badge>
            <span className="shrink-0 text-muted-foreground text-xs">
              {font.features.length} features
            </span>
          </div>
          {font.designer && (
            <p className="truncate text-muted-foreground text-xs">
              {font.designer}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
          <a
            href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Download on Google Fonts"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <DownloadSimpleIcon className="size-5" />
          </a>
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
        {font.isVariable && (
          <Badge variant="secondary" className="text-[10px]">
            Variable
          </Badge>
        )}
        {font.axes.map((a) => (
          <Badge key={a.tag} variant="outline" className="text-[10px]">
            {a.name ?? a.tag}
          </Badge>
        ))}
      </div>
    </Link>
  );
}
