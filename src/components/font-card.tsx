import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { FontActions } from "@/components/font-actions";
import { FontTraits } from "@/components/font-traits";
import { Badge } from "@/components/ui/badge";
import type { FilterSelection } from "@/lib/fonts/filter";
import { useLastDetailTab } from "@/lib/fonts/last-tab";
import type { FontRecord } from "@/lib/fonts/types";
import { useFontFacePreview } from "@/lib/fonts/use-font-face-preview";
import { cn } from "@/lib/utils";

interface Props {
  font: FontRecord;
  previewText: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  selection: FilterSelection;
  axisValues: Record<string, number>;
  lastRow?: boolean;
  staticActions?: boolean;
}

export const FontCard = memo(function FontCard({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
  selection,
  axisValues,
  lastRow = false,
  staticActions = false,
}: Props) {
  const { fontLoaded, previewStyle, previewRef, text } = useFontFacePreview(
    font,
    selection,
    axisValues,
    previewText
  );
  const [lastTab] = useLastDetailTab();

  return (
    <Link
      ref={previewRef}
      to="/$tab/$fontId"
      params={{ tab: lastTab, fontId: font.id }}
      viewTransition
      className={cn(
        "flex h-72 flex-col gap-4 overflow-hidden border-border border-r p-4 transition-[color,background-color] duration-fast ease-snap hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
        !lastRow && "border-b"
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="min-w-0 truncate">{font.name}</h3>
            <Badge
              variant="secondary"
              className="shrink-0 rounded-lg text-3xs tabular-nums"
              title={`${font.instances.length} named instance${font.instances.length === 1 ? "" : "s"}`}
            >
              {font.instances.length}
            </Badge>
          </div>
          <FontActions
            font={font}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            static={staticActions}
          />
        </div>
        {font.designer && (
          <p className="line-clamp-2 text-xs">{font.designer}</p>
        )}
      </div>

      {fontLoaded ? (
        <p
          dir="auto"
          style={previewStyle}
          className="min-h-16 flex-1 overflow-hidden break-words text-2xl leading-snug"
        >
          {text}
        </p>
      ) : (
        <div className="flex min-h-16 flex-1 flex-col gap-2.5 py-1" aria-hidden>
          <div className="h-6 w-[85%] animate-pulse rounded bg-muted" />
          <div className="h-6 w-[70%] animate-pulse rounded bg-muted" />
          <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        <FontTraits font={font} selection={selection} />
      </div>
    </Link>
  );
});
