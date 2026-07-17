import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import axesData from "@/data/axes.json";
import { cn } from "@/lib/utils";

// One axis's selection: request its whole range ("full", a variable stylesheet)
// or pin it to a single value ("one"). Shared by the Google Fonts axis controls.
export type AxisPick = { mode: "full" | "one"; value: number };

// A short heading above each method's steps: an icon, a one-line title (with an
// optional badge, e.g. "GDPR-friendly"), and a sentence on the trade-off.
export function MethodIntro({
    icon: Icon,
    title,
    blurb,
    badge,
}: {
    icon: React.ComponentType<{ className?: string; weight?: "duotone" }>;
    title: string;
    blurb: string;
    badge?: React.ReactNode;
}) {
    return (
        <div className="mb-4 flex gap-3">
            <Icon
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                weight="duotone"
            />
            <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{title}</p>
                    {badge}
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">{blurb}</p>
            </div>
        </div>
    );
}

export function Steps({ children }: { children: React.ReactNode }) {
    return <ol className="flex flex-col gap-8">{children}</ol>;
}

// One numbered step: a small circled index, a label, then its code block.
export function Step({
    n,
    label,
    children,
}: {
    n: number;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <li className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground">
                    {n}
                </span>
                <span className="text-sm">{label}</span>
            </div>
            <div className="pl-7">{children}</div>
        </li>
    );
}

// A muted "learn more" link out to the upstream docs for each method.
export function ExternalLink({ href, label }: { href: string; label: string }) {
    return (
        <Button
            variant="ghost"
            size="sm"
            className="mt-4 text-muted-foreground"
            render={
                // biome-ignore lint/a11y/useAnchorContent: Button injects children into this anchor via render; aria-label also set.
                <a href={href} target="_blank" rel="noreferrer" aria-label={label} />
            }
        >
            <ArrowUpRightIcon />
            {label}
        </Button>
    );
}

// A small pill toggle, shared by the pickers and the Advanced filter groups.
// Mirrors the instance-chip look on the tester: bordered, filled when active.
export function Pill({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs transition-[color,background-color,border-color,transform] active:scale-[0.97]",
                active
                    ? "border-primary bg-muted text-foreground"
                    : "text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
        >
            {children}
        </button>
    );
}

// Family name as a Google Fonts URL segment: spaces -> "+".
export const urlFamily = (name: string) => name.replace(/\s+/g, "+");

// Fontsource package slug: family name lowercased, spaces to hyphens, dropping
// anything that isn't a URL-safe word char. Matches fontsource.org's scheme
// (e.g. "Playfair Display" -> "playfair-display"). Bunny uses the same slug.
export function fontsourceSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// Shipped static weights, deduped and ascending; defaults to [400] when none
// are recorded so there's always at least one toggle.
export function weightList(weights: number[]): number[] {
    return [...new Set(weights.length > 0 ? weights : [400])].sort(
        (a, b) => a - b
    );
}

// Named stops for an axis (e.g. wght: Thin 100 … Black 900; wdth: Condensed 75
// … Expanded 125) from the axis registry, for the value pills. Empty for
// custom/parametric axes the registry doesn't name.
export const axisStops = (tag: string): { name: string; value: number }[] =>
    (
        axesData as Record<
            string,
            { fallbacks?: { name: string; value: number }[] }
        >
    )[tag]?.fallbacks ?? [];

// Weight name lookup (100 -> "Thin") for the static-family weight pills.
const WEIGHT_NAME = new Map(axisStops("wght").map((s) => [s.value, s.name]));
export const weightLabel = (w: number) => WEIGHT_NAME.get(w) ?? String(w);

// Official axis display name from Google Fonts' axis registry, falling back to
// the raw tag for axes the registry doesn't cover.
export const axisName = (tag: string): string =>
    (axesData as Record<string, { name?: string }>)[tag]?.name ?? tag;

// A sane generic fallback for the CSS font stack, by broad class. Serif/mono get
// their matching keyword; everything else falls back to sans-serif.
export function fallbackFor(cls: string): string {
    const c = cls.toLowerCase();
    if (c.includes("serif") && !c.includes("sans")) return "serif";
    if (c.includes("mono")) return "monospace";
    if (c.includes("hand") || c.includes("script")) return "cursive";
    return "sans-serif";
}
