import { cn } from "@/lib/utils";

// The shared filter pill: a bordered toggle showing a label and a font count.
// The multi-select primitive behind Pills (Tag/features/languages) and
// ColorFormatSection. The radio-style either/or filters use SegmentedPills
// instead, so their flush single-border group reads apart from these separate
// boxes. The variable-axes pill is deliberately NOT built on this, its
// flex-basis slider animation needs bespoke classes (see
// variable-axes-section.tsx).
//
// `aria-pressed` is always emitted (the Pills call sites historically omitted it;
// setting it uniformly is a behavior-neutral a11y fix). `spread` controls the
// label/count distribution: centered when unset (the wrapping Pills layout),
// pushed apart when set (the two-per-row grids).
export function PillButton({
  value,
  count,
  label,
  selected,
  onToggle,
  spread = true,
  mono = false,
  disabled = false,
  className,
}: {
  value: string;
  count: number;
  // Display label; the toggle always passes the raw `value`.
  label: string;
  selected: boolean;
  onToggle: (value: string) => void;
  // Push label and count to opposite ends; otherwise center them.
  spread?: boolean;
  // Render the label monospaced (right for tags like "liga", wrong for "Latin").
  mono?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        // Taller tap target on mobile (min-h-9 ~= 36px); md: restores the
        // compact desktop density.
        "flex min-h-9 items-center gap-1 rounded-md border px-2.5 py-2 text-xs transition-[color,background-color,border-color,transform] duration-[var(--motion-fast)] active:scale-[0.97] md:min-h-8 md:py-1",
        spread ? "justify-between" : "justify-center",
        disabled && "cursor-not-allowed",
        selected
          ? "border-primary bg-muted font-semibold text-foreground"
          : "text-muted-foreground",
        !disabled && !selected && "hover:bg-muted hover:text-primary",
        className
      )}
    >
      <span className={cn("truncate", mono && "font-mono")}>{label}</span>
      <span className="font-mono opacity-60">{count}</span>
    </button>
  );
}
