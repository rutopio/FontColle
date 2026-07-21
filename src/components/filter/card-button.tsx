import { cn } from "@/lib/utils";

// A large, square, tappable filter card: a specimen glyph above a label and a
// family count. Shared by the Category cards and the Weight/Width grids, which
// differ only in the specimen they render (passed as children).
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
  // The specimen glyph rendered at the top of the card.
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={cn(
        "relative flex cursor-pointer flex-col items-center gap-2 rounded-md border p-2 text-center shadow-xs outline-none transition-[color,box-shadow,border-color,background-color,transform] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]",
        selected
          ? "border-primary bg-muted"
          : "hover:bg-muted hover:text-primary",
        className
      )}
    >
      {children}
      <span className="w-full truncate font-medium text-muted-foreground text-xs leading-none">
        {label}
      </span>
      <span className="font-mono text-muted-foreground text-xs leading-none">
        {count}
      </span>
    </button>
  );
}
