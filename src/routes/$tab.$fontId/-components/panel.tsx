import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// A card section on the detail page, optionally titled with a count badge. When
// no label/count/action is given the header and its divider are dropped, leaving
// a plain card, used by the Use-tab methods, whose tab label already names them.
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
  // Optional control rendered at the right of the header (e.g. a copy button).
  action?: React.ReactNode;
  className?: string;
  // Extra classes on the body wrapper, e.g. max-w-lg to keep prose-width
  // content from stretching across a full-width card.
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const hasHeader = label != null || count != null || action != null;
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      {hasHeader && (
        <>
          <div className="p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-medium text-muted-foreground text-xs uppercase">
                {label}
              </h2>
              {action ??
                (count != null && (
                  <span className="font-mono text-muted-foreground text-xs">
                    {count}
                  </span>
                ))}
            </div>
          </div>
          <Separator />
        </>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
