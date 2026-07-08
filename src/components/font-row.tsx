import { DownloadSimpleIcon, HeartIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { isColorFont } from "@/lib/fonts/color";
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
  // Active filter selections, so footer badges highlight (secondary) when they
  // match the filter — mirrors FontCard.
  selectedClasses: string[];
  selectedFacets: string[];
  selectedColor: string[];
  selectedAxes: string[];
}

// Row layout (Google Fonts style): one family per full-width row. Family name +
// meta on the left, a large single-line preview on the right.
export function FontRow({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selectedClasses,
  selectedFacets,
  selectedColor,
  selectedAxes,
}: Props) {
  useEffect(() => {
    const weights = font.instances.map((i) => i.coords.wght ?? 400);
    ensureFontLoaded(font.name, weights.length ? weights : [400]);
  }, [font.name, font.instances]);

  const fontLoaded = useFontLoaded(font.name);

  return (
    <Link
      to="/$fontId"
      params={{ fontId: font.id }}
      className="flex h-28 px-4 flex-col justify-center gap-3 overflow-hidden border-b transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="shrink-0 font-medium text-sm">{font.name}</h3>
          {font.designer && (
            <span className="truncate text-muted-foreground text-xs">
              {font.designer}
            </span>
          )}
          {/* Same footer badges as FontCard: category / Variable-Static /
              Monochrome-Colorful / feature count, secondary when filtered. */}
          <Badge
            variant={
              selectedClasses.includes(font.class) ? "secondary" : "outline"
            }
            className="shrink-0 text-[10px]"
          >
            {font.class}
          </Badge>
          <Badge
            variant={
              (
                font.isVariable
                  ? selectedFacets.includes("variable") ||
                    selectedAxes.length > 0
                  : selectedFacets.includes("static")
              )
                ? "secondary"
                : "outline"
            }
            className="shrink-0 text-[10px]"
          >
            {font.isVariable ? "Variable" : "Static"}
          </Badge>
          <Badge
            variant={
              selectedColor.includes(isColorFont(font) ? "color" : "monochrome")
                ? "secondary"
                : "outline"
            }
            className="shrink-0 text-[10px]"
          >
            {isColorFont(font) ? "Colorful" : "Monochrome"}
          </Badge>
          {font.features.length > 0 && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {font.features.length} feature
              {font.features.length > 1 ? "s" : ""}
            </Badge>
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
          {/* A button, not an <a>: the whole row is already a <Link> (an
              <a>), and <a> can't nest <a> (hydration error). Open Google Fonts
              in a new tab and stop the click from triggering row navigation. */}
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
          dir="auto"
          style={{ fontFamily: previewFontFamily(font.name, fontLoaded) }}
          className="truncate text-3xl leading-tight"
        >
          {previewText || specimenFor(font)}
        </p>
      ) : (
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" aria-hidden />
      )}
    </Link>
  );
}
