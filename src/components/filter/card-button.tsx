import { cn } from "@/lib/utils";

export function CardButton({
  label,
  count,
  selected,
  onToggle,
  children,
  className,
}: {
  label: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        // h-22 matches skeleton placeholder cards.
        "relative flex h-22 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border p-2 text-center shadow-xs outline-none transition-[color,box-shadow,border-color,background-color,transform] duration-fast ease-snap focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]",
        selected ? "border-primary bg-muted" : "hover:bg-muted",
        className
      )}
    >
      {children}
      <span className="w-full truncate font-medium text-foreground text-xs leading-none">
        {label}
      </span>
      <span className="font-mono text-muted-foreground text-xs leading-none">
        {count}
      </span>
    </button>
  );
}
