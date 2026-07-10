import type { Ref } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

// sidebar-09 shell for the list and detail pages: a two-level sidebar (icon
// rail + the page's own panel) on the left, page content in the inset on the
// right. The list passes its FilterSidebar; the detail page passes its feature
// panel. The preview dock is mounted once in __root, so both pages share it.
export function FilterLayout({
  rail,
  sidebar,
  children,
}: {
  rail?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={
        {
          // A wider icon rail: it carries labelled group buttons, not just the
          // home link. Plus room for the side panel at its original 20rem.
          "--sidebar-width-icon": "4.5rem",
          "--sidebar-width": "24.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar rail={rail}>{sidebar}</AppSidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

// Right side of both pages, matching sidebar-09: a full-width header flush to
// the inset edge (the page's header content), then the page body constrained to
// max-w below it. The sidebar stays open, so there's no trigger.
//
// `scroll` puts the body inside its own ScrollArea so only the list scrolls and
// its scrollbar sits under the fixed header, not through it. The whole Column
// then owns the viewport height (`h-svh`), the header is a shrink-0 flex child
// (no sticky needed — the parent no longer scrolls), and `scrollViewportRef`
// exposes the scroll container so a virtualizer can bind to it. Without `scroll`
// the page scrolls as before (the detail page keeps that).
export function Column({
  header,
  headerClassName,
  children,
  scroll = false,
  scrollViewportRef,
}: {
  header: React.ReactNode;
  headerClassName?: string;
  children: React.ReactNode;
  scroll?: boolean;
  scrollViewportRef?: Ref<HTMLDivElement>;
}) {
  const headerEl = (
    <header
      className={cn(
        "flex h-16 shrink-0 items-center gap-2 border-border border-b bg-background px-4",
        !scroll && "sticky top-0 z-10"
      )}
    >
      <div className={cn("flex flex-1 items-center gap-3", headerClassName)}>
        {header}
      </div>
    </header>
  );

  const body = (
    <div className="mx-auto flex w-full max-w-(--breakpoint-2xl) flex-col gap-6 p-6 pb-24">
      {children}
    </div>
  );

  if (scroll) {
    // The list scrolls inside its own container. The wrapper is positioned
    // absolutely to fill the inset without contributing to its flex height —
    // otherwise the (pre-virtualization) list height blows out the shared
    // `min-h-svh` shell and the container never gets a finite height to cap the
    // ScrollArea. A relative spacer keeps the inset's own box intact.
    return (
      <div className="relative min-w-0 flex-1">
        <div className="absolute inset-0 flex flex-col">
          {headerEl}
          <ScrollArea
            viewportRef={scrollViewportRef}
            className="min-h-0 flex-1"
          >
            {body}
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {headerEl}
      {body}
    </div>
  );
}
