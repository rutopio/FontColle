import {
  DownloadSimpleIcon,
  GithubLogoIcon,
  HeartIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { FontTraits } from "@/components/font-traits";
import { HoverBoldIcon } from "@/components/hover-bold-icon";
import type { FilterSelection } from "@/lib/fonts/filter";
import {
  ensureFontLoaded,
  ensureFontRangeLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { variationSettings } from "@/lib/fonts/preview-style";
import { fontSlug } from "@/lib/fonts/slug";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreviewCoords } from "@/lib/fonts/use-preview-coords";
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
  // Weight/width/axis picks from the sidebar drive the live preview; the
  // derivation is shared with FontRow via usePreviewCoords.
  const {
    weight: activeWeight,
    variationCoords,
    italic: previewItalic,
  } = usePreviewCoords(font, selection, axisValues);

  // Variable fonts: load the full axis range once so any weight/width the user
  // picks renders from a single variable file. Static fonts: request the actual
  // selected weight cut (appended on each switch) so it doesn't stay on an old
  // one for lack of that file.
  useEffect(() => {
    if (font.isVariable) {
      ensureFontRangeLoaded(
        font.name,
        font.axes,
        font.facets.includes("has-italic")
      );
    } else {
      ensureFontLoaded(font.name, [activeWeight]);
    }
  }, [font.name, font.isVariable, font.axes, font.facets, activeWeight]);

  const fontLoaded = useFontLoaded(font.name);
  const settings = variationSettings(variationCoords);
  const previewStyle: React.CSSProperties = {
    fontFamily: previewFontFamily(font.name, fontLoaded),
    // activeWeight already folds in the wght slider; set font-weight directly
    // (not via a coords map) so the browser can smooth/synthesize it.
    fontWeight: activeWeight,
    fontStyle: previewItalic ? "italic" : undefined,
    fontVariationSettings: settings || undefined,
    // Smooth the weight/axis change instead of a hard jump.
    transition: "font-weight 200ms ease, font-variation-settings 200ms ease",
  };

  return (
    <Link
      to="/$tab/$fontId"
      params={{ tab: "specimen", fontId: fontSlug(font.name) }}
      className="flex h-72 flex-col gap-4 overflow-hidden rounded-lg border bg-card p-5 transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate">{font.name}</h3>
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
            <HoverBoldIcon
              icon={HeartIcon}
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
            <HoverBoldIcon icon={DownloadSimpleIcon} className="size-5" />
          </button>
          {/* Only when the family has a known upstream repo. A button, not an
              <a>, for the same nested-<a> reason as the download button. */}
          {font.repositoryUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(
                  font.repositoryUrl as string,
                  "_blank",
                  "noreferrer"
                );
              }}
              aria-label="View source repository"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <HoverBoldIcon icon={GithubLogoIcon} className="size-5" />
            </button>
          )}
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
