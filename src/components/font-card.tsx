import { Heart } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ensureFontLoaded } from "@/lib/fonts/loader";
import type { FontRecord } from "@/lib/fonts/types";
import { cn } from "@/lib/utils";

interface Props {
  font: FontRecord;
  previewText: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

export function FontCard({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
}: Props) {
  useEffect(() => {
    ensureFontLoaded(font.name, font.isVariable);
  }, [font.name, font.isVariable]);

  // Weight/instance switcher (pain point 4). Build the option list from named
  // instances when variable, else fall back to a single default.
  const weightOptions = useMemo(() => {
    const fromInstances = font.instances
      .map((i) => ({
        label: i.name ?? "Regular",
        weight: i.coords.wght ?? 400,
        coords: i.coords,
      }))
      // de-dup by weight for a compact switcher, prefer upright names
      .filter(
        (o, idx, arr) => arr.findIndex((x) => x.weight === o.weight) === idx
      )
      .sort((a, b) => a.weight - b.weight);
    if (fromInstances.length) return fromInstances;
    return [
      { label: "Regular", weight: 400, coords: {} as Record<string, number> },
    ];
  }, [font.instances]);

  const [active, setActive] = useState(() => {
    const reg = weightOptions.find((o) => o.weight === 400);
    return reg ?? weightOptions[Math.floor(weightOptions.length / 2)];
  });

  const previewStyle: React.CSSProperties = {
    fontFamily: `"${font.name}", sans-serif`,
    fontWeight: active.weight,
    fontVariationSettings: buildVariationSettings(active.coords),
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-sm">{font.name}</h3>
          <p className="truncate text-muted-foreground text-xs">
            {font.class}
            {font.designer ? ` · ${font.designer}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(font.id)}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Heart
            weight={isFavorite ? "fill" : "regular"}
            className={cn("size-5", isFavorite && "text-red-500")}
          />
        </button>
      </div>

      <p
        style={previewStyle}
        className="min-h-16 break-words text-2xl leading-snug"
      >
        {previewText || "The quick brown fox"}
      </p>

      {weightOptions.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {weightOptions.map((o) => (
            <button
              key={`${o.label}-${o.weight}`}
              type="button"
              onClick={() => setActive(o)}
              className={cn(
                "rounded border px-2 py-0.5 text-xs transition-colors",
                active === o
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:border-foreground"
              )}
            >
              {o.weight}
            </button>
          ))}
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

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-muted-foreground text-xs">
          {font.features.length} features
        </span>
        <a
          href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline underline-offset-2 hover:text-foreground"
        >
          Download ↗
        </a>
      </div>
    </div>
  );
}

function buildVariationSettings(coords: Record<string, number>) {
  const entries = Object.entries(coords).filter(([tag]) => tag !== "wght");
  if (!entries.length) return undefined;
  return entries.map(([tag, val]) => `"${tag}" ${val}`).join(", ");
}
