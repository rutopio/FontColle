import { Heart } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

export function FontCard({
  font,
  previewText,
  isFavorite,
  onToggleFavorite,
}: Props) {
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

  useEffect(() => {
    ensureFontLoaded(
      font.name,
      weightOptions.map((o) => o.weight)
    );
  }, [font.name, weightOptions]);

  const [active, setActive] = useState(() => {
    const reg = weightOptions.find((o) => o.weight === 400);
    return reg ?? weightOptions[Math.floor(weightOptions.length / 2)];
  });

  const fontLoaded = useFontLoaded(font.name);
  const previewStyle: React.CSSProperties = {
    fontFamily: previewFontFamily(font.name, fontLoaded),
    fontWeight: active.weight,
    fontVariationSettings: buildVariationSettings(active.coords),
    // Smooth the weight/axis change instead of a hard jump.
    transition: "font-weight 200ms ease, font-variation-settings 200ms ease",
  };

  return (
    <Link
      to="/$fontId"
      params={{ fontId: font.id }}
      className="flex flex-col gap-4 rounded-lg border bg-card p-5 transition-colors hover:border-foreground focus-visible:border-foreground focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium text-sm">{font.name}</h3>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {font.class}
            </Badge>
          </div>
          {font.designer && (
            <p className="truncate text-muted-foreground text-xs">
              {font.designer}
            </p>
          )}
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
        {previewText || specimenFor(font)}
      </p>

      {weightOptions.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {weightOptions.map((o) => (
            <button
              key={`${o.label}-${o.weight}`}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActive(o);
              }}
              className={cn(
                "rounded border px-2 py-0.5 font-mono text-xs transition-colors",
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

      <div className="mt-auto flex items-center justify-between border-t pt-3">
        <span className="text-muted-foreground text-xs">
          {font.features.length} features
        </span>
        <a
          href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs underline underline-offset-2 hover:text-foreground"
        >
          Download ↗
        </a>
      </div>
    </Link>
  );
}

function buildVariationSettings(coords: Record<string, number>) {
  const entries = Object.entries(coords).filter(([tag]) => tag !== "wght");
  if (!entries.length) return undefined;
  return entries.map(([tag, val]) => `"${tag}" ${val}`).join(", ");
}
