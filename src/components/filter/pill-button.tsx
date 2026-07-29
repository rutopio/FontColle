import { cn } from "@/lib/utils";

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
  label: string;
  selected: boolean;
  onToggle: (value: string) => void;
  spread?: boolean;
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
        "flex min-h-9 items-center gap-1 rounded-md border px-2.5 py-2 text-xs transition-[color,background-color,border-color,transform] duration-[var(--motion-fast)] ease-[var(--ease-snap)] active:scale-[0.97] md:min-h-8 md:py-1",
        spread ? "justify-between" : "justify-center",
        disabled && "cursor-not-allowed",
        selected
          ? "border-primary bg-muted font-semibold text-foreground"
          : "text-muted-foreground",
        !disabled && !selected && "hover:bg-muted",
        className
      )}
    >
      <span className={cn("truncate text-foreground", mono && "font-mono")}>
        {label}
      </span>
      <span className="font-mono opacity-60">{count}</span>
    </button>
  );
}
