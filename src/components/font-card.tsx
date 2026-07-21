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
  // Active filter slice, drives both the live preview (weight/width/axes) and
  // which trait badges render highlighted.
  selection: FilterSelection;
  // Session slider positions (0-100%) per selected variable axis. Not part of
  // the filter: each font maps the percent onto its own axis range for preview.
  axisValues: Record<string, number>;
}

// memo: cards mount by the hundreds in the virtualized grid. Toggling one
// favorite changes only that card's `isFavorite`; the rest keep referentially
// stable props (see index/route: `toggle` is useCallback-stable, `selection`/
// `axisValues`/`previewText` are unchanged), so memo bails them out.
export const FontCard = memo(function FontCard({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selection,
  axisValues,
}: Props) {
  // Weight/width/axis picks from the sidebar drive the live preview; the
  // font-loading effect and preview style are shared with FontRow.
  const { fontLoaded, previewStyle } = useFontFacePreview(
    font,
    selection,
    axisValues
  );

  return (
    <Link
      to="/$tab/$fontId"
      params={{ tab: "specimen", fontId: fontSlug(font.id) }}
      className="flex h-72 flex-col gap-4 overflow-hidden rounded-lg border bg-card p-5 transition-colors hover:bg-muted focus-visible:border-foreground focus-visible:outline-none"
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate">{font.name}</h3>
          <FontActions
            font={font}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
        {font.designer && (
          <p className="line-clamp-2 text-muted-foreground text-xs">
            {font.designer}
          </p>
        )}
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
});
