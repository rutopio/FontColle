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

// 5rem, not the 4.5rem the buttons need: the rail is a bordered box with an
// 8px margin, and this is the width the shell reserves for the pair (see
// AppSidebar). Declared on both the container and the provider — the container
// so the header's own left margin can read it, the provider because
// SidebarProvider writes a 3rem default inline that beats anything inherited.
const SHELL_WIDTHS = {
  "--sidebar-width-icon": "5rem",
  "--sidebar-width": "25rem",
} as React.CSSProperties;

// The preview dock is mounted once in __root, so both pages share it.
export function FilterLayout({
  rail,
  sidebar,
  children,
  header,
  panelOpen = true,
  favoriteFontId,
}: {
  rail?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  // Rendered here rather than inside Column, so it spans the filter panel as
  // well as the content. Inside the inset it could only ever be as wide as
  // the content, which made the two pages' headers different widths — the
  // list page's panel takes 25rem the detail page does not have.
  header?: React.ReactNode;
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
      {/* A column, so the shared header can sit above the row of rail / panel /
          content. min-h-0 lets that row take the remaining height instead of
          overflowing the container.

          The vars are declared here AND on the provider below. SidebarProvider
          writes its own 3rem default inline, which beats anything inherited,
          so the provider still needs its copy; the container's is what the
          header's own margin reads. */}
      <div
        className="container relative flex h-full flex-col"
        style={SHELL_WIDTHS}
      >
        {/* Inset from the left by the rail's width, so the wordmark keeps the
            top-left corner on every page and the header begins where the
            page's own material does.

            The extra 8px either side lines its edges up with the boxes below:
            the filter panel and the content box each sit inside a margin of
            that much, so without it the header overhangs both by exactly one
            gutter.

            It stays in flow and reserves its own height; the rail below is
            pulled back up into that band by a negative margin on the provider
            (see there), which is the one element the rail's absolutely
            positioned box actually resolves against. */}
        {/* Mobile-only chrome, outside RouteFade so it stays put like the
            desktop rail (which never fades). Desktop hides it via md:hidden.
            Hoisted here with the header: the phone stacks app bar then header,
            the order it had while the header lived inside Column, and the two
            can only interleave as siblings. */}
        <MobileTopBar favoriteFontId={favoriteFontId} />
        {header ? (
          // relative + z-20: the row below is pulled up under this band by a
          // negative margin, and would otherwise paint over it.
          <div className="relative z-20 shrink-0 md:mr-2 md:ml-[calc(var(--sidebar-width-icon)+0.5rem)]">
            <ColumnHeader>{header}</ColumnHeader>
          </div>
        ) : null}
        {/* -mt-18 pulls the whole row back up under the header band, so the
            rail — whose box is absolutely positioned against THIS element and
            clipped to it — can start at the very top and keep the wordmark in
            the corner. The panel and the inset each add the same offset back,
            so only the rail rises. */}
        <SidebarProvider
          className="relative min-h-0 flex-1 md:-mt-18"
          open={panelOpen}
          style={SHELL_WIDTHS}
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
          {/* The frame lives inside, on the header and the content block
              separately (see Column), so the inset keeps only the margins that
              place the pair.

              md:bg-transparent so the gap between those two boxes shows the
              body's sidebar tint, the same gutter the rail and panel float on.
              The inset's own bg-background would otherwise fill it and read as
              one surface with a line across it rather than two separate
              boxes. */}
          {/* mt-20 clears the page header lifted above it, the same offset the
              filter panel takes: 4.5rem of header band plus the shell's 0.5rem
              gutter. */}
          <SidebarInset className="min-w-0 md:mt-20 md:mr-2 md:mb-2 md:ml-0 md:bg-transparent md:peer-data-[state=collapsed]:ml-2">
            <RouteFade distance={16} className="flex min-h-0 flex-1 flex-col">
              {children}
            </RouteFade>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}

// The page header, a box of its own spanning the shell rather than sitting
// inside the content column. Passed to FilterLayout's `header` prop, so both
// pages get the same width whether or not a filter panel is open beside the
// content.
//
// On mobile this may grow to two rows when the list header's controls wrap.
function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="mt-2 flex min-h-16 shrink-0 items-center gap-2 border-border bg-background px-2 py-2 max-md:mt-0 max-md:border-b md:h-16 md:rounded-xl md:border md:py-0">
      <div className="flex flex-1 flex-wrap items-center gap-3 md:flex-nowrap">
        {children}
      </div>
    </header>
  );
}

// Only the body scrolls, so the scrollbar sits between the page header and the
// footer rather than running through them.
export function Column({
  subheader,
  footer,
  footerHidden = false,
  children,
  aside,
  scrollViewportRef,
}: {
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
        "flex shrink-0 items-center gap-2 overflow-hidden bg-background p-2",
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
        {/* With the header lifted out to FilterLayout, what remains — subheader,
            body, footer — is the content box, and carries the rounded frame the
            inset used to supply. Its own bg-background too: the inset is
            transparent so the gap between the boxes shows the page's gutter
            tint, which leaves each box to paint its own surface. */}
        <div className="flex min-h-0 flex-1 flex-col bg-background md:overflow-hidden md:rounded-xl md:border md:border-border">
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
    </div>
  );
}
