import { Link } from "@tanstack/react-router";
import type * as React from "react";
import { LogoIcon } from "@/components/logo-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/ui/sidebar";

export function AppSidebar({
  rail,
  children,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  rail?: React.ReactNode;
}) {
  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <div className="my-2 mr-0 ml-2 flex h-[calc(100%-1rem)] w-[calc(var(--sidebar-width-icon)-0.5rem)] shrink-0 flex-col gap-2">
        <Link
          to="/"
          aria-label="FontColle, all fonts"
          className="group/logo flex h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl p-2 text-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring dark:hover:bg-white/6"
        >
          <LogoIcon className="size-7 transition-[stroke-width] group-hover/logo:[stroke-width:2]" />
          <span className="font-mono text-[9px] group-hover/logo:font-bold">
            FontColle
          </span>
        </Link>

        {rail && (
          <div className="flex min-h-0 flex-col overflow-hidden">
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col p-2">{rail}</div>
            </ScrollArea>
          </div>
        )}
      </div>

      <Sidebar
        collapsible="none"
        className="m-2 hidden h-auto min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-background md:mt-20 md:flex"
      >
        {children}
      </Sidebar>
    </Sidebar>
  );
}
