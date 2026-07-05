import { ArrowLeftIcon, ToggleRightIcon, XIcon } from "@phosphor-icons/react";
import {
  createFileRoute,
  Link,
  notFound,
  useCanGoBack,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Column, FilterLayout } from "@/components/filter-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { withFacets } from "@/lib/fonts/facets";
import {
  buildFeatureSettings,
  DEFAULT_ON,
  featureName,
} from "@/lib/fonts/features";
import {
  ensureFontRangeLoaded,
  previewFontFamily,
  useFontLoaded,
} from "@/lib/fonts/loader";
import { getAllFonts } from "@/lib/fonts/queries";
import { specimenFor } from "@/lib/fonts/specimen";
import type { FontRecord } from "@/lib/fonts/types";
import { usePreview } from "@/lib/preview/context";

export const Route = createFileRoute("/$fontId")({
  component: DetailPage,
  loader: async ({ params }) => {
    // The detail page needs only the one font; its sidebar shows that font's
    // OpenType features, not the catalog-wide filter facets.
    const all = withFacets(await getAllFonts());
    const font = all.find((f) => f.id === params.fontId);
    if (!font) throw notFound();
    return { font };
  },
  notFoundComponent: () => (
    <div className="mx-auto w-full max-w-(--breakpoint-2xl) p-6">
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
  const { font } = Route.useLoaderData();

  // Feature overrides live at the page level so the sidebar toggles and the
  // type tester share one source of truth. The W3C default state seeds default-on
  // features as ON so the UI matches what the browser renders (todo §8b).
  const w3cDefaults = () =>
    Object.fromEntries(font.features.map((tag) => [tag, DEFAULT_ON.has(tag)]));
  const [featureState, setFeatureState] =
    useState<Record<string, boolean>>(w3cDefaults);
  const toggleFeature = (tag: string) =>
    setFeatureState((p) => ({ ...p, [tag]: !p[tag] }));
  const resetFeatures = () => setFeatureState(w3cDefaults());

  return (
    <FilterLayout
      sidebar={
        <FeatureSidebar
          features={font.features}
          state={featureState}
          onToggle={toggleFeature}
          onReset={resetFeatures}
        />
      }
    >
      <Detail font={font} featureState={featureState} />
    </FilterLayout>
  );
}

function Detail({
  font,
  featureState,
}: {
  font: FontRecord;
  featureState: Record<string, boolean>;
}) {
  const { text } = usePreview();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [size, setSize] = useState(72);
  const specimen = text || specimenFor(font);

  // Axis state: tag -> current value, seeded from each axis default.
  const [axisState, setAxisState] = useState<Record<string, number>>(() =>
    Object.fromEntries(font.axes.map((a) => [a.tag, a.default ?? a.min ?? 0]))
  );

  useEffect(() => {
    ensureFontRangeLoaded(font.name, font.axes);
  }, [font.name, font.axes]);

  const fontLoaded = useFontLoaded(font.name);

  const specimenStyle: React.CSSProperties = useMemo(() => {
    const varSettings = font.axes
      .map((a) => `"${a.tag}" ${axisState[a.tag]}`)
      .join(", ");
    return {
      fontFamily: previewFontFamily(font.name, fontLoaded),
      fontSize: `${size}px`,
      fontWeight: axisState.wght ? Math.round(axisState.wght) : undefined,
      fontVariationSettings: varSettings || undefined,
      fontFeatureSettings: buildFeatureSettings(featureState),
    };
  }, [font.name, font.axes, axisState, size, featureState, fontLoaded]);

  const loadInstance = (coords: Record<string, number>) => {
    setAxisState((prev) => ({ ...prev, ...coords }));
  };

  return (
    <Column
      headerClassName="justify-between"
      header={
        <>
          <div className="flex min-w-0 items-center gap-3">
            {/* Going back (not a fresh /) lets the router restore the list's
                scroll position and filter URL. Fall back to / on deep links. */}
            {canGoBack ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="All fonts"
                onClick={() => router.history.back()}
              >
                <ArrowLeftIcon />
              </Button>
            ) : (
              <Button
                render={<Link to="/" />}
                variant="ghost"
                size="icon"
                aria-label="All fonts"
              >
                <ArrowLeftIcon />
              </Button>
            )}
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
        </>
      }
    >
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
        <p
          dir="auto"
          style={specimenStyle}
          className="break-words leading-tight"
        >
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
                    fontFamily: previewFontFamily(font.name, fontLoaded),
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

// Detail-page side panel: the font's OpenType features as toggle pills, one per
// row, mono tag on the left and full name on the right. Defaults follow the
// browser/W3C behavior (default-on features start ON) via the seeded state.
function FeatureSidebar({
  features,
  state,
  onToggle,
  onReset,
}: {
  features: string[];
  state: Record<string, boolean>;
  onToggle: (tag: string) => void;
  onReset: () => void;
}) {
  // Order: W3C default-on features first, then alphabetical within each group.
  const sorted = useMemo(
    () =>
      [...features].sort((a, b) => {
        const da = DEFAULT_ON.has(a) ? 0 : 1;
        const db = DEFAULT_ON.has(b) ? 0 : 1;
        return da - db || a.localeCompare(b);
      }),
    [features]
  );

  // Reset is offered only when some feature deviates from its W3C default.
  const dirty = features.some((tag) => state[tag] !== DEFAULT_ON.has(tag));

  return (
    <aside className="flex h-full w-full min-w-0 flex-col text-sidebar-foreground">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase tracking-wide">
              <ToggleRightIcon className="size-4" />
              OpenType features
            </h2>
            {dirty && (
              <button
                type="button"
                onClick={onReset}
                aria-label="Reset OpenType features to defaults"
                className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
              >
                <XIcon className="size-3" />
                Reset
              </button>
            )}
          </div>
          {features.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              This font exposes no OpenType features.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sorted.map((tag) => {
                const on = state[tag];
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggle(tag)}
                    aria-pressed={on}
                    className={cnFeature(on)}
                  >
                    <span className="font-mono text-xs">{tag}</span>
                    <span className="flex-1 truncate text-right text-[11px] text-muted-foreground">
                      {featureName(tag)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

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
