import {
  DownloadSimpleIcon,
  GithubLogoIcon,
  HeartIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { FontTraits } from "@/components/font-traits";
import type { FilterSelection } from "@/lib/fonts/filter";
import {
  ensureFontLoaded,
  ensureFontRangeLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { variationSettings } from "@/lib/fonts/preview-style";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreviewCoords } from "@/lib/fonts/use-preview-coords";
import { cn } from "@/lib/utils";

interface Props {
  font: FontRecord;
  previewText: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  // Active filter slice, so footer badges highlight when they match — mirrors
  // FontCard.
  selection: FilterSelection;
  // Session slider positions (0-100%) per selected variable axis, same as
  // FontCard: each font maps the percent onto its own axis range for preview.
  axisValues: Record<string, number>;
}

// Row layout (Google Fonts style): one family per full-width row. Family name +
// meta on the left, a large single-line preview on the right.
export function FontRow({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selection,
  axisValues,
}: Props) {
  // Same weight/width/axis derivation as FontCard, so the row previews the
  // sidebar's picks identically.
  const { weight: activeWeight, variationCoords } = usePreviewCoords(
    font,
    selection,
    axisValues
  );

  // Variable fonts: load the full axis range once so any picked weight/width
  // renders from one variable file. Static fonts: request the selected weight
  // cut so the preview doesn't stay on an old one for lack of that file.
  useEffect(() => {
    if (font.isVariable) {
      ensureFontRangeLoaded(font.name, font.axes);
    } else {
      ensureFontLoaded(font.name, [activeWeight]);
    }
  }, [font.name, font.isVariable, font.axes, activeWeight]);

  const fontLoaded = useFontLoaded(font.name);
  const settings = variationSettings(variationCoords);

  return (
    <Link
      to="/$fontId"
      params={{ fontId: font.id }}
      className="flex h-28 flex-col justify-center gap-3 overflow-hidden border-b px-4 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="shrink-0 font-medium text-sm">{font.name}</h3>
          {font.designer && (
            <span className="truncate text-muted-foreground text-xs">
              {font.designer}
            </span>
          )}
          {/* Same footer badges as FontCard, kept from wrapping (shrink-0). */}
          <FontTraits
            font={font}
            selection={selection}
            badgeClassName="shrink-0"
          />
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
              <GithubLogoIcon className="size-5" />
            </button>
          )}
        </div>
      </div>

      {fontLoaded ? (
        <p
          dir="auto"
          style={{
            fontFamily: previewFontFamily(font.name, fontLoaded),
            fontWeight: activeWeight,
            fontVariationSettings: settings || undefined,
            transition:
              "font-weight 200ms ease, font-variation-settings 200ms ease",
          }}
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
