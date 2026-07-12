import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// A titled card section on the detail page, with an optional count badge.
export function Panel({
  label,
  count,
  className,
  children,
}: {
  label: string;
  count?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <div className="p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium text-muted-foreground text-xs uppercase">
            {label}
          </h2>
          {count != null && (
            <span className="font-mono text-muted-foreground text-xs">
              {count}
            </span>
          )}
        </div>
      </div>
      <Separator />
      <div className="p-4">{children}</div>
    </section>
  );
}
