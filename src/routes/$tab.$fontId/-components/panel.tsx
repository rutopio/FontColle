import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// With no label, count or action the header and its divider are dropped: the
// Use-tab methods rely on that, their tab label already naming them.
export function Panel({
  label,
  count,
  action,
  className,
  bodyClassName,
  children,
}: {
  label?: string;
  count?: number;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const hasHeader = label != null || count != null || action != null;
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      {hasHeader && (
        <>
          <div className="p-4">
            <div
              className={cn(
                "flex justify-between",
                // A count sits on the label's baseline; an icon button reads
                // right only when centred on it.
                action ? "items-center" : "items-baseline"
              )}
            >
              <h2 className="font-medium text-muted-foreground text-xs uppercase">
                {label}
              </h2>
              {/* An action is usually a size-6 button, taller than the xs label
                  beside it. Collapse the overflow so a panel with an action is
                  the same height as one with a count or nothing at all. */}
              {action ? (
                <div className="-my-1 flex items-center">{action}</div>
              ) : (
                count != null && (
                  <span className="font-mono text-muted-foreground text-xs">
                    {count}
                  </span>
                )
              )}
            </div>
          </div>
          <Separator />
        </>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
