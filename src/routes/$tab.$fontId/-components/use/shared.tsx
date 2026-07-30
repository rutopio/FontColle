import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import axesData from "@/data/axes.json";
import { cn } from "@/lib/utils";

// "full" = variable range, "one" = pinned value.
export type AxisPick = { mode: "full" | "one"; value: number };

export function MethodIntro({ blurb }: { blurb: string }) {
  return <p className="mb-4 text-pretty text-xs leading-relaxed">{blurb}</p>;
}

export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="flex flex-col gap-8">{children}</ol>;
}

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

export function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="mt-4 text-muted-foreground"
      nativeButton={false}
      role="link"
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
        "cursor-pointer rounded-md border px-2.5 py-1 font-mono text-xs transition-[color,background-color,border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-snap)] active:scale-[0.97]",
        active
          ? "border-primary bg-muted text-foreground"
          : "text-muted-foreground hover:border-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export const urlFamily = (name: string) => name.replace(/\s+/g, "+");

// Matches fontsource.org's scheme ("Playfair Display" -> "playfair-display").
// Bunny uses the same slug.
export function fontsourceSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function weightList(weights: number[]): number[] {
  return [...new Set(weights.length > 0 ? weights : [400])].sort(
    (a, b) => a - b
  );
}

export const axisStops = (tag: string): { name: string; value: number }[] =>
  (
    axesData as Record<
      string,
      { fallbacks?: { name: string; value: number }[] }
    >
  )[tag]?.fallbacks ?? [];

const WEIGHT_NAME = new Map(axisStops("wght").map((s) => [s.value, s.name]));
export const weightLabel = (w: number) => WEIGHT_NAME.get(w) ?? String(w);

export const axisName = (tag: string): string =>
  (axesData as Record<string, { name?: string }>)[tag]?.name ?? tag;

export function fallbackFor(cls: string): string {
  const c = cls.toLowerCase();
  if (c.includes("serif") && !c.includes("sans")) return "serif";
  if (c.includes("mono")) return "monospace";
  if (c.includes("hand") || c.includes("script")) return "cursive";
  return "sans-serif";
}
