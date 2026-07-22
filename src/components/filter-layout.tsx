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
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

// Mobile-only top strip (<768px). The desktop icon rail, which carries the
// home link, Favorite, Theme and About controls, collapses to an unreachable
// Sheet on mobile (see app-sidebar), so this bar restores them. Hidden on
// desktop, where the rail provides them.
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
        <FavoriteToggle fontId={favoriteFontId} variant="bar" />
        <ThemeToggle variant="bar" />
        <AboutLink variant="bar" />
      </div>
    </div>
  );
}

// sidebar-09 shell for the list and detail pages: a two-level sidebar (icon
// rail + the page's own panel) on the left, page content in the inset on the
// right. The list passes its FilterSidebar; the detail page passes its feature
// panel. The preview dock is mounted once in __root, so both pages share it.
export function FilterLayout({
  rail,
  personal,
  sidebar,
  children,
  panelOpen = true,
  favoriteFontId,
}: {
  rail?: React.ReactNode;
  // Footer control grouped with Favorite (the list page's Preset button).
  personal?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  // When false, the two-level sidebar collapses to just its icon rail, so the
  // inset reclaims the panel's width. The detail page closes it on the read-only
  // Detail view, which has no controls to host.
  panelOpen?: boolean;
  // The detail page passes its font id so the footer Favorite button hearts
  // this font; the list omits it, keeping the favorites-view toggle.
  favoriteFontId?: string;
}) {
  // The sidebar frame (provider, rail container, home/theme) is rendered outside
  // the RouteFade wrappers so it stays put; only the three injected content
  // blocks, rail buttons, panel, main, fade in when the route changes.
  // FilterLayout re-mounts on a real route change, so each RouteFade plays its
  // entry once; see route-fade.tsx for why it must not be keyed on page state.
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
        <AppSidebar
          rail={rail ? <RouteFade>{rail}</RouteFade> : undefined}
          personal={personal}
          favoriteFontId={favoriteFontId}
        >
          <RouteFade className="flex size-full flex-col">{sidebar}</RouteFade>
        </AppSidebar>
        {/* min-w-0 lets the inset shrink to the space left by the fixed-width
          sidebar instead of forcing 100vw (w-full) and pushing itself past the
          viewport, otherwise wide content (e.g. a heavy display font's
          specimen) makes the whole page overflow horizontally. */}
        <SidebarInset className="min-w-0">
          {/* Mobile-only chrome, outside RouteFade so it stays put like the
              desktop rail (which never fades). Desktop hides it via md:hidden. */}
          <MobileTopBar favoriteFontId={favoriteFontId} />
          <RouteFade distance={16} className="flex min-h-0 flex-1 flex-col">
            {children}
          </RouteFade>
        </SidebarInset>
      </SidebarProvider>
    </>
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
  subheader,
  footer,
  footerHidden = false,
  children,
  scrollViewportRef,
}: {
  header: React.ReactNode;
  headerClassName?: string;
  // A row pinned directly under the header (above the scroll body). The detail
  // page uses it for the mobile-only tab strip; omitted elsewhere.
  subheader?: React.ReactNode;
  // Bottom bar, a mirror of the header: same height, flush to the inset edge,
  // border on top instead of bottom. Both pages use it for the preview field.
  footer?: React.ReactNode;
  // When true, the footer slides down out of view and gives its height back to
  // the scroll body, used on the detail page's non-Sample views, where the
  // shared preview field is irrelevant.
  footerHidden?: boolean;
  children: React.ReactNode;
  scrollViewportRef?: Ref<HTMLDivElement>;
}) {
  const headerEl = (
    // Fixed 16-height row on desktop; on mobile it may grow to two rows when the
    // list header's search + meta controls wrap (min-h-16 keeps the floor).
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
    // Shown: 4rem tall, slid to y:0, top border. Hidden: collapses to 0 height
    // and slides down past its own edge, handing the height back to the body.
    // Motion drives height + y together so it reads as a slide-away, not a pop,
    // and lands every frame instead of a reflow-y CSS transition dropping the
    // first one. overflow-hidden clips the field while it collapses.
    <motion.footer
      initial={false}
      animate={
        footerHidden ? { height: 0, y: "100%" } : { height: "4rem", y: "0%" }
      }
      transition={{ duration: 0.2, ease: "easeOut" }}
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
        // min-h-full so a short body (e.g. an Empty state) fills the scroll
        // viewport, letting a flex-1 child center in the remaining space instead
        // of sitting up top. Taller content just grows past it as before.
        "mx-auto flex min-h-full w-full max-w-(--breakpoint-2xl) flex-col gap-4 p-4 md:gap-6 md:p-6",
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
  // absolutely to fill the inset without contributing to its flex height,
  // otherwise the (pre-virtualization) list height blows out the shared
  // `min-h-svh` shell and the container never gets a finite height to cap the
  // ScrollArea. A relative spacer keeps the inset's own box intact.
  return (
    <div className="relative min-w-0 flex-1">
      <div className="absolute inset-0 flex flex-col">
        {headerEl}
        {subheader}
        <ScrollArea viewportRef={scrollViewportRef} className="min-h-0 flex-1">
          {body}
        </ScrollArea>
        {footerEl}
      </div>
    </div>
  );
}
