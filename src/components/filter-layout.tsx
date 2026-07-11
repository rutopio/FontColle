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
  panelOpen = true,
}: {
  rail?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  // When false, the two-level sidebar collapses to just its icon rail, so the
  // inset reclaims the panel's width. The detail page closes it on the read-only
  // Detail view, which has no controls to host.
  panelOpen?: boolean;
}) {
  return (
    <SidebarProvider
      open={panelOpen}
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
      {/* min-w-0 lets the inset shrink to the space left by the fixed-width
          sidebar instead of forcing 100vw (w-full) and pushing itself past the
          viewport — otherwise wide content (e.g. a heavy display font's
          specimen) makes the whole page overflow horizontally. */}
      <SidebarInset className="min-w-0">{children}</SidebarInset>
    </SidebarProvider>
  );
}

// Right side of both pages, matching sidebar-09: a fixed header flush to the
// inset edge, a body that scrolls inside its own ScrollArea, and a fixed footer
// bar. The header and footer stay put while only the body scrolls, so the
// scrollbar sits between them rather than running through the chrome. The whole
// Column owns the viewport height; `scrollViewportRef` exposes the scroll
// container so a virtualizer (the list) can bind to it.
export function Column({
  header,
  headerClassName,
  footer,
  footerHidden = false,
  children,
  scrollViewportRef,
}: {
  header: React.ReactNode;
  headerClassName?: string;
  // Bottom bar, a mirror of the header: same height, flush to the inset edge,
  // border on top instead of bottom. Both pages use it for the preview field.
  footer?: React.ReactNode;
  // When true, the footer slides down out of view and gives its height back to
  // the scroll body — used on the detail page's non-Sample views, where the
  // shared preview field is irrelevant.
  footerHidden?: boolean;
  children: React.ReactNode;
  scrollViewportRef?: Ref<HTMLDivElement>;
}) {
  const headerEl = (
    <header className="flex h-16 shrink-0 items-center gap-2 border-border border-b bg-background px-4">
      <div className={cn("flex flex-1 items-center gap-3", headerClassName)}>
        {header}
      </div>
    </header>
  );

  const footerEl = footer ? (
    // h-16 when shown, h-0 + translate-y-full when hidden: the bar slides down
    // past its own edge and collapses, handing its height back to the body. The
    // transition animates both so it reads as a slide-away, not a pop.
    <footer
      className={cn(
        "flex shrink-0 items-center gap-2 overflow-hidden border-border bg-background px-4 transition-[height,transform] duration-200 ease-linear",
        footerHidden
          ? "h-0 translate-y-full border-t-0"
          : "h-16 translate-y-0 border-t"
      )}
    >
      <div className="flex flex-1 items-center gap-3">{footer}</div>
    </footer>
  ) : null;

  const body = (
    <div
      className={cn(
        "mx-auto flex w-full max-w-(--breakpoint-2xl) flex-col gap-6 p-6",
        // A solid footer bar sits below the scroll area, so content needs no
        // extra clearance. Without one, the floating preview dock overlaps the
        // last rows, so keep the tall bottom padding to clear it.
        footerEl ? "pb-6" : "pb-24"
      )}
    >
      {children}
    </div>
  );

  // The body scrolls inside its own container. The wrapper is positioned
  // absolutely to fill the inset without contributing to its flex height —
  // otherwise the (pre-virtualization) list height blows out the shared
  // `min-h-svh` shell and the container never gets a finite height to cap the
  // ScrollArea. A relative spacer keeps the inset's own box intact.
  return (
    <div className="relative min-w-0 flex-1">
      <div className="absolute inset-0 flex flex-col">
        {headerEl}
        <ScrollArea viewportRef={scrollViewportRef} className="min-h-0 flex-1">
          {body}
        </ScrollArea>
        {footerEl}
      </div>
    </div>
  );
}
