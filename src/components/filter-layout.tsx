import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AppSidebar } from "@/components/app-sidebar";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { LogoIcon } from "@/components/logo-icon";
import { RouteFade } from "@/components/route-fade";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

// Mobile-only top strip (<768px). The desktop icon rail — which carries the
// home link, Favorite and Theme controls — collapses to an unreachable Sheet on
// mobile (see app-sidebar), so this bar restores those three controls. Hidden on
// desktop, where the rail provides them.
function MobileTopBar({ favoriteFontId }: { favoriteFontId?: string }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-border border-b bg-background px-3 md:hidden">
      <Link
        to="/"
        aria-label="All fonts"
        className="flex items-center gap-1.5 text-primary"
      >
        <LogoIcon className="size-6" />
        <span className="font-mono text-xs">FontColle</span>
      </Link>
      <div className="flex items-center gap-1">
        <FavoriteToggle fontId={favoriteFontId} variant="bar" />
        <ThemeToggle variant="bar" />
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
  sidebar,
  children,
  panelOpen = true,
  favoriteFontId,
}: {
  rail?: React.ReactNode;
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
  // blocks — rail buttons, panel, main — fade in when the route changes.
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
          favoriteFontId={favoriteFontId}
        >
          <RouteFade className="flex size-full flex-col">{sidebar}</RouteFade>
        </AppSidebar>
        {/* min-w-0 lets the inset shrink to the space left by the fixed-width
          sidebar instead of forcing 100vw (w-full) and pushing itself past the
          viewport — otherwise wide content (e.g. a heavy display font's
          specimen) makes the whole page overflow horizontally. */}
        <SidebarInset className="min-w-0">
          {/* Mobile-only chrome, outside RouteFade so it stays put like the
              desktop rail (which never fades). Desktop hides it via md:hidden. */}
          <MobileTopBar favoriteFontId={favoriteFontId} />
          <RouteFade className="flex min-h-0 flex-1 flex-col">
            {children}
          </RouteFade>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}

// Right side of both pages: a sticky header (+ optional subheader) pinned to
// the viewport top, the body flowing in the document, and a sticky footer bar
// pinned to the bottom. The whole document scrolls (body is the scroll root),
// not an inner container — so iOS Chrome's native pull-to-refresh and bottom
// rubber-band work and the body is never inflated past the viewport (the old
// strip-below-the-footer bug). The list virtualizes against the window.
export function Column({
  header,
  headerClassName,
  subheader,
  footer,
  footerHidden = false,
  children,
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
  // the scroll body — used on the detail page's non-Sample views, where the
  // shared preview field is irrelevant.
  footerHidden?: boolean;
  children: React.ReactNode;
}) {
  const headerEl = (
    // Fixed 16-height row on desktop; on mobile it may grow to two rows when the
    // list header's search + meta controls wrap (min-h-16 keeps the floor).
    // The header + subheader are wrapped in a single sticky container (see the
    // return), so this row itself isn't sticky.
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
        // sticky bottom-0 pins the preview dock to the viewport bottom while the
        // document scrolls behind it.
        "sticky bottom-0 z-20 flex shrink-0 items-center gap-2 overflow-hidden bg-background px-4",
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
        // flex-1 so a short body (e.g. an Empty state) fills the space between
        // the sticky header and footer, letting a flex child center in the
        // remainder instead of sitting up top. Taller content grows the document.
        "mx-auto flex w-full max-w-(--breakpoint-2xl) flex-1 flex-col gap-6 p-6",
        // A solid footer bar sits below the body, so content needs no extra
        // clearance. Without one, the floating preview dock overlaps the last
        // rows, so keep the tall bottom padding to clear it.
        footerEl ? "pb-6" : "pb-24"
      )}
    >
      {children}
    </div>
  );

  // The whole document scrolls (body is the scroll root), so iOS Chrome's native
  // pull-to-refresh and bottom rubber-band work and the body is never inflated
  // past the viewport. The header and footer are sticky (pinned to the viewport
  // edges) while the body flows between them. The list virtualizes against the
  // window (see font-grid / glyphs useWindowVirtualizer), so no inner scroll
  // container is needed.
  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      {/* Header + subheader pinned together to the viewport top. Wrapping both
          in one sticky container avoids computing a per-breakpoint top offset
          for the subheader (the header height varies: one row on desktop, up to
          two when the mobile controls wrap). */}
      <div className="sticky top-0 z-20">
        {headerEl}
        {subheader}
      </div>
      {body}
      {footerEl}
    </div>
  );
}
