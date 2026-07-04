import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Column, ColumnHeader, FilterLayout } from "@/components/filter-layout";
import { Badge } from "@/components/ui/badge";
import { buildFacetIndex } from "@/lib/fonts/data";
import { withFacets } from "@/lib/fonts/facets";
import {
  buildFeatureSettings,
  DEFAULT_ON,
  featureName,
} from "@/lib/fonts/features";
import {
  emptyFilter,
  type FilterState,
  filterToSearch,
} from "@/lib/fonts/filter";
import { ensureFontRangeLoaded, previewFontFamily } from "@/lib/fonts/loader";
import { getAllFonts } from "@/lib/fonts/queries";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";

export const Route = createFileRoute("/$fontId")({
  component: DetailPage,
  loader: async ({ params }) => {
    // One catalog fetch: the detail body needs the font, the sidebar needs the
    // facet index for its counts (todo §8b: pure-navigation sidebar).
    const all = withFacets(await getAllFonts());
    const font = all.find((f) => f.id === params.fontId);
    if (!font) throw notFound();
    return { font, facetIndex: buildFacetIndex(all) };
  },
  notFoundComponent: () => (
    <div className="container p-6">
      <Link
        to="/"
        className="text-muted-foreground text-sm hover:text-foreground"
      >
        ← All fonts
      </Link>
      <p className="py-16 text-center text-muted-foreground">Font not found.</p>
    </div>
  ),
});

function DetailPage() {
  const { font, facetIndex } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  // Sidebar on the detail page is pure navigation: any pill click goes back to
  // the list with that filter applied (todo §8b).
  const goToList = (next: FilterState) => {
    navigate({ to: "/", search: filterToSearch(next) });
  };
  return (
    <FilterLayout
      index={facetIndex}
      filter={emptyFilter}
      onFilterChange={goToList}
    >
      <Detail font={font} />
    </FilterLayout>
  );
}

function Detail({ font }: { font: FontRecord }) {
  const { text } = usePreview();
  const [size, setSize] = useState(72);
  const specimen = text || "The quick brown fox jumps over 1234567890";

  // Axis state: tag -> current value, seeded from each axis default.
  const [axisState, setAxisState] = useState<Record<string, number>>(() =>
    Object.fromEntries(font.axes.map((a) => [a.tag, a.default ?? a.min ?? 0]))
  );

  // Feature overrides: tag -> on/off. Seed default-on features as ON so the UI
  // matches what the browser renders (todo §8b).
  const [featureState, setFeatureState] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(font.features.map((tag) => [tag, DEFAULT_ON.has(tag)]))
  );

  useEffect(() => {
    ensureFontRangeLoaded(font.name, font.axes);
  }, [font.name, font.axes]);

  const specimenStyle: React.CSSProperties = useMemo(() => {
    const varSettings = font.axes
      .map((a) => `"${a.tag}" ${axisState[a.tag]}`)
      .join(", ");
    return {
      fontFamily: previewFontFamily(font.name),
      fontSize: `${size}px`,
      fontWeight: axisState.wght ? Math.round(axisState.wght) : undefined,
      fontVariationSettings: varSettings || undefined,
      fontFeatureSettings: buildFeatureSettings(featureState),
    };
  }, [font.name, font.axes, axisState, size, featureState]);

  const gsub = font.features.filter((t) => !GPOS_TAGS.has(t));
  const gpos = font.features.filter((t) => GPOS_TAGS.has(t));

  const loadInstance = (coords: Record<string, number>) => {
    setAxisState((prev) => ({ ...prev, ...coords }));
  };

  return (
    <Column>
      <ColumnHeader className="justify-between">
        <div className="flex min-w-0 flex-col">
          <Link
            to="/"
            className="w-fit text-muted-foreground text-xs hover:text-foreground"
          >
            ← All fonts
          </Link>
          <h1
            className="truncate font-semibold text-2xl leading-tight"
            style={{ fontFamily: `"${font.name}", sans-serif` }}
          >
            {font.name}
          </h1>
        </div>
        <a
          href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg border border-foreground bg-foreground px-4 py-2 font-medium text-background text-sm"
        >
          Download ↗
        </a>
      </ColumnHeader>

      {(font.designer || font.class) && (
        <div className="flex flex-wrap items-center gap-2">
          {font.designer && (
            <span className="text-muted-foreground text-sm">
              by {font.designer}
            </span>
          )}
          <Badge variant="secondary">{font.class}</Badge>
          {font.isVariable && <Badge variant="secondary">Variable</Badge>}
          {font.license && <Badge variant="outline">{font.license}</Badge>}
        </div>
      )}

      {/* TYPE TESTER */}
      <Panel label="Type tester">
        <div className="mb-4 flex items-center justify-end gap-2 text-muted-foreground text-xs">
          Size
          <input
            type="range"
            min={16}
            max={200}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="accent-foreground"
          />
          <span className="w-12 text-right font-mono text-foreground">
            {size}px
          </span>
        </div>
        <p style={specimenStyle} className="break-words leading-tight">
          {specimen}
        </p>
      </Panel>

      {/* VARIABLE AXES */}
      {font.axes.length > 0 && (
        <Panel label="Variable axes" count={font.axes.length}>
          <div className="flex flex-col">
            {font.axes.map((a) => (
              <div
                key={a.tag}
                className="grid grid-cols-[130px_1fr_56px] items-center gap-3 border-border border-t py-2 first:border-t-0"
              >
                <div className="text-sm">
                  {a.name ?? a.tag}
                  <span className="ml-1.5 font-mono text-muted-foreground text-xs">
                    {a.tag}
                  </span>
                </div>
                <div>
                  <input
                    type="range"
                    min={a.min ?? 0}
                    max={a.max ?? 100}
                    value={axisState[a.tag]}
                    step={0.5}
                    onChange={(e) =>
                      setAxisState((prev) => ({
                        ...prev,
                        [a.tag]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-foreground"
                  />
                  <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>{a.min}</span>
                    <span>{a.max}</span>
                  </div>
                </div>
                <span className="text-right font-mono text-xs">
                  {Math.round(axisState[a.tag])}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* NAMED INSTANCES */}
      {font.instances.length > 0 && (
        <Panel label="Named instances" count={font.instances.length}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
            {font.instances.map((inst) => (
              <button
                key={inst.name}
                type="button"
                onClick={() => loadInstance(inst.coords)}
                className="rounded-md border p-3 text-left transition-colors hover:border-foreground"
              >
                <span
                  className="text-2xl"
                  style={{
                    fontFamily: previewFontFamily(font.name),
                    fontWeight: inst.coords.wght
                      ? Math.round(inst.coords.wght)
                      : undefined,
                    fontVariationSettings: Object.entries(inst.coords)
                      .map(([t, v]) => `"${t}" ${v}`)
                      .join(", "),
                  }}
                >
                  Ag
                </span>
                <span className="mt-2 block font-mono text-muted-foreground text-xs">
                  {inst.name}
                </span>
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* OPENTYPE FEATURES */}
      {font.features.length > 0 && (
        <Panel label="OpenType features" count={font.features.length}>
          {gsub.length > 0 && (
            <FeatureGroup
              title="Substitution (GSUB)"
              tags={gsub}
              state={featureState}
              onToggle={(tag) =>
                setFeatureState((p) => ({ ...p, [tag]: !p[tag] }))
              }
            />
          )}
          {gpos.length > 0 && (
            <FeatureGroup
              title="Positioning (GPOS)"
              tags={gpos}
              state={featureState}
              onToggle={(tag) =>
                setFeatureState((p) => ({ ...p, [tag]: !p[tag] }))
              }
            />
          )}
        </Panel>
      )}

      {/* SPECS + SUBSETS */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel label="Specs">
          <Spec label="Variable" value={font.isVariable ? "Yes" : "No"} />
          <Spec label="Axes" value={String(font.axes.length)} />
          <Spec label="Named instances" value={String(font.instances.length)} />
          <Spec
            label="OpenType features"
            value={String(font.features.length)}
          />
          {font.glyphCount != null && (
            <Spec label="Glyphs" value={font.glyphCount.toLocaleString()} />
          )}
          {font.charCount != null && (
            <Spec label="Characters" value={font.charCount.toLocaleString()} />
          )}
          {font.version != null && (
            <Spec label="Version" value={String(font.version)} />
          )}
          {font.dateAdded && <Spec label="Added" value={font.dateAdded} />}
          {font.license && <Spec label="License" value={font.license} />}
        </Panel>
        <Panel label="Subsets">
          <div className="flex flex-wrap gap-1.5">
            {font.subsets
              .filter((s) => s !== "menu")
              .map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
          </div>
        </Panel>
      </div>
    </Column>
  );
}

// Registered GPOS features we surface; everything else is treated as GSUB.
const GPOS_TAGS = new Set([
  "kern",
  "mark",
  "mkmk",
  "cpsp",
  "size",
  "palt",
  "vhal",
]);

function Panel({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </h2>
        {count != null && (
          <span className="font-mono text-muted-foreground text-xs">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function FeatureGroup({
  title,
  tags,
  state,
  onToggle,
}: {
  title: string;
  tags: string[];
  state: Record<string, boolean>;
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-2 text-[10px] text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {tags.map((tag) => {
          const on = state[tag];
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={cnFeature(on)}
            >
              <span className="font-mono text-xs">{tag}</span>
              <span className="flex-1 truncate text-right text-[11px] text-muted-foreground">
                {featureName(tag)}
              </span>
              <span
                className={
                  on
                    ? "relative h-3.5 w-6 shrink-0 rounded-full bg-foreground"
                    : "relative h-3.5 w-6 shrink-0 rounded-full bg-border"
                }
              >
                <span
                  className="absolute top-0.5 size-2.5 rounded-full bg-background transition-all"
                  style={{ left: on ? "0.875rem" : "0.125rem" }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function cnFeature(on: boolean) {
  return [
    "flex items-center justify-between gap-2.5 rounded-md border px-2.5 py-2 transition-colors hover:border-foreground",
    on ? "border-foreground bg-muted" : "border-border",
  ].join(" ");
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-border border-t py-1.5 text-sm first:border-t-0">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
