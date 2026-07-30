import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
                action ? "items-center" : "items-baseline"
              )}
            >
              <h2 className="font-medium text-muted-foreground text-xs uppercase">
                {label}
              </h2>
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
