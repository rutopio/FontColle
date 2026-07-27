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
  selection: FilterSelection;
  axisValues: Record<string, number>;
}

// memo: rows mount by the hundreds in the virtualized grid, and toggling one
// favorite changes only that row's prop, so the rest bail out.
export const FontRow = memo(function FontRow({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selection,
  axisValues,
}: Props) {
  const { fontLoaded, previewStyle, previewRef } = useFontFacePreview(
    font,
    selection,
    axisValues
  );

  return (
    <Link
      ref={previewRef}
      to="/$tab/$fontId"
      params={{ tab: "instances", fontId: fontSlug(font.id) }}
      // A background step, not FontCard's scale: the row is full-bleed and sits
      // on its separator, so scaling would peel it off both edges. active: uses
      // foreground/10 rather than a second surface token, since --muted and
      // --accent are the same value; a foreground tint darkens in light mode
      // and lightens in dark, correct in both.
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
              <span className="hidden truncate text-xs sm:inline">
                {font.designer}
              </span>
            )}
            {/* Footer badges (shrink-0); hidden until lg. md is the worst case
                for this row, not a safe one: the sidebar returns at md and
                takes ~24.5rem, so the row is at its narrowest exactly when it
                would also be carrying name + designer + badges + three action
                icons. Only the name truncates, so the chips win the space and
                the family name -- the thing being scanned -- loses it. They
                come back at lg, where the row is wide enough to hold all of it
                without squeezing the name. */}
            <FontTraits
              font={font}
              selection={selection}
              badgeClassName="hidden shrink-0 lg:inline-flex"
            />
          </div>
          <FontActions
            font={font}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            // Rows stack into a shared right edge, so a missing repo button
            // would slide this row's other icons out of the column.
            reserveRepoSlot
          />
        </div>
        {/* Designer on its own second row on narrow screens only. */}
        {font.designer && (
          <span className="truncate text-xs sm:hidden">{font.designer}</span>
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
        <div
          className="mx-4 h-15 w-2/3 animate-pulse rounded bg-muted"
          aria-hidden
        />
      )}
    </Link>
  );
});
