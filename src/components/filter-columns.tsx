import type * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

/* Rail and panel together span --sidebar-width; each column gives up half of
   the row's gap-2, hence the 0.5rem each subtracts. Header controls that line
   up with the panel's right edge repeat the panel's calc — the widths cannot
   be hoisted to a token because a :root token cannot see --sidebar-width-icon. */

export function FilterRailColumn({ children }: { children?: React.ReactNode }) {
  if (!children) return null;

  return (
    <div className="hidden h-full min-h-0 w-[calc(var(--sidebar-width-icon)-0.5rem)] shrink-0 flex-col overflow-hidden md:flex">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col p-2">{children}</div>
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
    <div className="hidden h-full min-h-0 w-[calc(var(--sidebar-width)-var(--sidebar-width-icon)-0.5rem)] shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background md:flex">
      {children}
    </div>
  );
}
