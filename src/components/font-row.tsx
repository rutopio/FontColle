import { HeartIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
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
}

// Row layout (Google Fonts style): one family per full-width row. Family name +
// meta on the left, a large single-line preview on the right.
export function FontRow({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
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
      className="flex h-28 flex-col justify-center gap-3 overflow-hidden border-b transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-medium text-sm">{font.name}</h3>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {font.class}
          </Badge>
          {font.isVariable && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {font.axes.length} axes
            </Badge>
          )}
          <span className="shrink-0 text-muted-foreground text-xs">
            {font.features.length} features
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(font.id);
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <HeartIcon
            weight={isFavorite ? "fill" : "regular"}
            className={cn("size-5", isFavorite && "text-red-500")}
          />
        </button>
      </div>

      {fontLoaded ? (
        <p
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
