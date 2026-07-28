import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { Ref } from "react";
import { AboutLink } from "@/components/about-link";
import { AppSidebar } from "@/components/app-sidebar";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { LogoIcon } from "@/components/logo-icon";
import { RouteFade } from "@/components/route-fade";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

// Mobile-only top strip. The desktop icon rail collapses to an unreachable
// Sheet on mobile (see app-sidebar), so this bar restores its controls.
function MobileTopBar({ favoriteFontId }: { favoriteFontId?: string }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-border border-b bg-background px-3 md:hidden">
      <Link
        to="/"
        // Contains the visible "FontColle" text, per WCAG 2.5.3 (Label in Name).
        aria-label="FontColle, all fonts"
        className="flex items-center gap-1.5 text-primary"
      >
        <LogoIcon className="size-5" />
        <span className="font-mono text-xs">FontColle</span>
      </Link>
      <div className="flex items-center gap-1">
        {/* Both pages, unconditionally: the control reads `fontId` to decide
            what it means (hearting this font on the detail page, toggling the
            ?fav=1 view on the list). The column headers carry it on desktop,
            but they are cramped on a phone, so on mobile it belongs here with
            the other two. */}
        <FavoriteToggle fontId={favoriteFontId} variant="bar" />
        <ThemeToggle variant="bar" />
        <AboutLink variant="bar" />
      </div>
    </div>
  );
}

// The preview dock is mounted once in __root, so both pages share it.
export function FilterLayout({
  rail,
  sidebar,
  children,
  panelOpen = true,
  favoriteFontId,
}: {
  rail?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  panelOpen?: boolean;
  // Set by the detail page, so its footer Favorite hearts this font.
  favoriteFontId?: string;
}) {
  // The frame sits outside the RouteFade wrappers so it stays put while the
  // three injected blocks fade. See route-fade.tsx for why those must key on
  // the pathname rather than on mounting.
  return (
    <>
      {/* Keyboard skip-nav: lets keyboard/screen-reader users jump past the rail
          and sidebar straight to the page content. Visually hidden until focused. */}
      <a
        href="#main"
        className="sr-only fixed top-2 left-2 z-[100] -translate-y-full rounded-md bg-background px-4 py-2 font-medium text-sm shadow ring-2 ring-sidebar-ring transition-transform focus:not-sr-only focus:translate-y-0"
      >
        Skip to content
      </a>
      {/* The whole shell (rail, panel and inset alike) lives inside the
          container: centred, capped at 1536px, with 2rem gutters. `relative` on
          the provider gives the sidebar, which is absolutely positioned rather
          than viewport-fixed, a padding-box to anchor to, so it starts on the
          container's content edge instead of the screen's. */}
      <div className="container h-full">
        <SidebarProvider
          className="relative"
          open={panelOpen}
          style={
            {
              // 5rem, not the 4.5rem the buttons need: the rail is a bordered
              // box with an 8px margin, and this is the width the shell
              // reserves for the pair (see AppSidebar).
              "--sidebar-width-icon": "5rem",
              "--sidebar-width": "25rem",
            } as React.CSSProperties
          }
        >
          <AppSidebar rail={rail ? <RouteFade>{rail}</RouteFade> : undefined}>
            {/* flex-1 + min-h-0, not size-full: the panel is the only thing in
                the box now, but it still has to be allowed to shrink below its
                content's height, or its own ScrollArea has nothing to scroll
                within and the overflow is clipped instead. */}
            <RouteFade className="flex min-h-0 w-full flex-1 flex-col">
              {sidebar}
            </RouteFade>
          </AppSidebar>
          {/* min-w-0 lets the inset shrink to the space left by the fixed-width
          sidebar instead of forcing 100vw (w-full) and pushing itself past the
          viewport, otherwise wide content (e.g. a heavy display font's
          specimen) makes the whole page overflow horizontally. */}
          {/* Boxed like shadcn's sidebar-08 (variant="inset"), but applied here
              rather than by switching variant, which would also re-pad both
              levels of the sidebar. The margin lets body's sidebar tint read as
              a gutter around the box; overflow-hidden clips the header and
              footer borders to the rounded corners. Desktop only: below md the
              inset is the whole screen and a floating box would just waste it.
              As a flex item, flex-basis:0 (flex-1) sets the width, so the
              margin eats into the free space instead of overflowing w-full. */}
          {/* ml-0 for the same reason sidebar-08's inset uses it: the filter
              panel beside it already carries an 8px right margin, so a left
              margin here would double the gap between the two boxes. When the
              panel is collapsed away (the detail page's Detail view) there is
              nothing left to supply it, so take it back. */}
          <SidebarInset className="min-w-0 md:my-2 md:mr-2 md:ml-0 md:overflow-hidden md:rounded-xl md:border md:border-border md:peer-data-[state=collapsed]:ml-2">
            {/* Mobile-only chrome, outside RouteFade so it stays put like the
              desktop rail (which never fades). Desktop hides it via md:hidden. */}
            <MobileTopBar favoriteFontId={favoriteFontId} />
            <RouteFade distance={16} className="flex min-h-0 flex-1 flex-col">
              {children}
            </RouteFade>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}

// Only the body scrolls, so the scrollbar sits between the fixed header and
// footer rather than running through them.
export function Column({
  header,
  headerClassName,
  subheader,
  footer,
  footerHidden = false,
  children,
  aside,
  scrollViewportRef,
}: {
  header: React.ReactNode;
  headerClassName?: string;
  subheader?: React.ReactNode;
  footer?: React.ReactNode;
  // Slides the footer away and gives its height back to the scroll body.
  footerHidden?: boolean;
  children: React.ReactNode;
  // A controls column pinned beside the body, between the header and footer.
  // It gets its own scroller, so working through a long panel doesn't drag the
  // content along with it and vice versa. Supplies its own responsive
  // visibility; the detail page hides it below lg for the FAB drawer.
  aside?: React.ReactNode;
  scrollViewportRef?: Ref<HTMLDivElement>;
}) {
  const headerEl = (
    // On mobile this may grow to two rows when the list header's controls wrap.
    <header className="flex min-h-16 shrink-0 items-center gap-2 border-border border-b bg-background px-4 py-2 md:h-16 md:py-0">
      <div
        className={cn(
          "flex flex-1 flex-wrap items-center gap-3 md:flex-nowrap",
          headerClassName
        )}
      >
        {header}
      </div>
    </header>
  );

  const footerEl = footer ? (
    // Motion drives height + y together, landing every frame where a reflow-y
    // CSS transition drops the first.
    <motion.footer
      initial={false}
      animate={
        footerHidden ? { height: 0, y: "100%" } : { height: "4rem", y: "0%" }
      }
      transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
      className={cn(
        "flex shrink-0 items-center gap-2 overflow-hidden bg-background px-4",
        footerHidden ? "border-t-0" : "border-border border-t"
      )}
    >
      <div className="flex flex-1 items-center gap-3">{footer}</div>
    </motion.footer>
  ) : null;

  const body = (
    <div
      id="main"
      // Skip-nav target; -scroll-mt keeps it clear of the fixed header on focus.
      className={cn(
        "scroll-mt-20",
        // min-h-full so a short body (an Empty state) fills the viewport and a
        // flex-1 child can center in it.
        "mx-auto flex min-h-full w-full flex-col gap-4 p-4 md:gap-6 md:p-6",
        // With a solid footer below the scroll area the content needs no
        // clearance; without one the floating preview dock would overlap the
        // last rows, hence the tall bottom padding.
        footerEl ? "pb-6" : "pb-24"
      )}
    >
      {children}
    </div>
  );

  // Absolutely positioned so it fills the inset without contributing to its
  // flex height: otherwise the pre-virtualization list height blows out the
  // `min-h-svh` shell and the ScrollArea never gets a finite height to cap.
  // A relative spacer keeps the inset's own box intact.
  return (
    <div className="relative min-w-0 flex-1">
      <div className="absolute inset-0 flex flex-col">
        {headerEl}
        {subheader}
        {/* The aside is a sibling of the scroll area, not part of its content:
            that is what keeps the two independent, each scrolling only itself.
            Both are capped by this row, so neither can push the footer down. */}
        <div className="flex min-h-0 flex-1">
          {aside}
          <ScrollArea
            viewportRef={scrollViewportRef}
            className="min-h-0 min-w-0 flex-1"
          >
            {body}
          </ScrollArea>
        </div>
        {footerEl}
      </div>
    </div>
  );
}
