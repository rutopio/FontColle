import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { FontActions } from "@/components/font-actions";
import { FontTraits } from "@/components/font-traits";
import { Badge } from "@/components/ui/badge";
import type { FilterSelection } from "@/lib/fonts/filter";
import { fontSlug } from "@/lib/fonts/slug";
import type { FontRecord } from "@/lib/fonts/types";
import { useFontFacePreview } from "@/lib/fonts/use-font-face-preview";

interface Props {
  font: FontRecord;
  previewText: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  selection: FilterSelection;
  axisValues: Record<string, number>;
  staticActions?: boolean;
}

export const FontRow = memo(function FontRow({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selection,
  axisValues,
  staticActions = false,
}: Props) {
  const { fontLoaded, previewStyle, previewRef, text } = useFontFacePreview(
    font,
    selection,
    axisValues,
    previewText
  );

  return (
    <Link
      ref={previewRef}
      to="/$tab/$fontId"
      params={{ tab: "instances", fontId: fontSlug(font.id) }}
      viewTransition
      className="flex h-32 flex-col justify-center gap-4 overflow-hidden rounded-lg transition-[color,background-color,transform] duration-fast ease-snap hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset active:scale-[0.995] active:bg-accent"
    >
      <div className="flex flex-col gap-0.5 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate sm:shrink-0">{font.name}</h3>
            <Badge
              variant="secondary"
              className="shrink-0 rounded-lg text-3xs tabular-nums"
              title={`${font.instances.length} named instance${font.instances.length === 1 ? "" : "s"}`}
            >
              {font.instances.length}
            </Badge>
            {font.designer && (
              <span className="hidden truncate text-xs sm:inline">
                {font.designer}
              </span>
            )}
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
            reserveRepoSlot
            static={staticActions}
          />
        </div>
        {font.designer && (
          <span className="truncate text-xs sm:hidden">{font.designer}</span>
        )}
      </div>

      {fontLoaded ? (
        <p
          dir="auto"
          style={previewStyle}
          className="truncate px-4 text-3xl leading-tight"
        >
          {text}
        </p>
      ) : (
        <div
          className="mx-4 h-9 w-2/3 animate-pulse rounded bg-muted"
          aria-hidden
        />
      )}
    </Link>
  );
});
