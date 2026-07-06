// A titled card section on the detail page, with an optional count badge.
export function Panel({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </h2>
        {count != null && (
          <span className="font-mono text-muted-foreground text-xs">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
