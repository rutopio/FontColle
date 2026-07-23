import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { FontActions } from "@/components/font-actions";
import { FontTraits } from "@/components/font-traits";
import type { FilterSelection } from "@/lib/fonts/filter";
import { fontSlug } from "@/lib/fonts/slug";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { useFontFacePreview } from "@/lib/fonts/use-font-face-preview";

interface Props {
  font: FontRecord;
  previewText: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  // Active filter slice, so footer badges highlight when they match, mirrors
  // FontCard.
  selection: FilterSelection;
  // Session slider positions (0-100%) per selected variable axis, same as
  // FontCard: each font maps the percent onto its own axis range for preview.
  axisValues: Record<string, number>;
}

// Row layout (Google Fonts style): one family per full-width row. Family name +
// meta on the left, a large single-line preview on the right.
//
// memo: like FontCard, rows mount by the hundreds in the virtualized grid.
// Toggling one favorite changes only that row's `isFavorite`; the rest keep
// referentially stable props, so memo bails them out.
export const FontRow = memo(function FontRow({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selection,
  axisValues,
}: Props) {
  // Same weight/width/axis derivation as FontCard, so the row previews the
  // sidebar's picks identically; the font-loading effect and preview style are
  // shared with FontCard.
  const { fontLoaded, previewStyle } = useFontFacePreview(
    font,
    selection,
    axisValues
  );

  return (
    <Link
      to="/$tab/$fontId"
      params={{ tab: "instances", fontId: fontSlug(font.id) }}
      // Press feedback is a background step, not the scale FontCard uses: the
      // row is full-bleed and sits directly on its separator, so scaling it
      // would peel it off both viewport edges and the divider. active: goes one
      // step past hover via foreground/10 rather than a second surface token,
      // because --muted and --accent are the same value; a foreground tint
      // darkens in light mode and lightens in dark, correct in both. Touch has
      // no hover, so this is its only pre-navigation feedback.
      className="flex h-32 flex-col justify-center gap-4 overflow-hidden transition-colors duration-[var(--motion-fast)] ease-[var(--ease-snap)] hover:bg-muted focus-visible:bg-muted/80 focus-visible:outline-none active:bg-foreground/10"
    >
      {/* Narrow (mobile): [name + actions] row over a designer row, stacked.
          Wide: name, designer and traits all inline, actions on the right. */}
      <div className="flex flex-col gap-0.5 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate sm:shrink-0">{font.name}</h3>
            {/* Designer inline next to the name on wide rows only. */}
            {font.designer && (
              <span className="hidden truncate text-muted-foreground text-xs sm:inline">
                {font.designer}
              </span>
            )}
            {/* Footer badges (shrink-0); hidden on narrow rows where there's no room. */}
            <FontTraits
              font={font}
              selection={selection}
              badgeClassName="hidden shrink-0 sm:inline-flex"
            />
          </div>
          <FontActions
            font={font}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
        {/* Designer on its own second row on narrow screens only. */}
        {font.designer && (
          <span className="truncate text-muted-foreground text-xs sm:hidden">
            {font.designer}
          </span>
        )}
      </div>

      {fontLoaded ? (
        <p
          dir="auto"
          style={previewStyle}
          className="truncate px-4 text-3xl leading-loose"
        >
          {previewText || specimenFor(font)}
        </p>
      ) : (
        // Matches the loaded preview's box: mx-2 mirrors its px-2 so the line
        // doesn't shift horizontally on swap, and h-15 = text-3xl/leading-loose.
        <div
          className="mx-4 h-15 w-2/3 animate-pulse rounded bg-muted"
          aria-hidden
        />
      )}
    </Link>
  );
});
