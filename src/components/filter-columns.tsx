import type * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

/* --rail-width and --panel-width are the columns' real widths, set on the shell
   in filter-layout. Header controls that line up with a column repeat its token
   directly; main is flex-1, so no width here is derived from another. */

export function FilterRailColumn({ children }: { children?: React.ReactNode }) {
  if (!children) return null;

  return (
    <div className="hidden h-full min-h-0 w-(--rail-width) shrink-0 flex-col overflow-hidden md:flex">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">{children}</div>
      </ScrollArea>
    </div>
  );
}

export function FilterPanelColumn({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="hidden h-full min-h-0 w-(--panel-width) shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background md:flex">
      {children}
    </div>
  );
}
