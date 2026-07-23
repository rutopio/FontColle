import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  type ErrorComponentProps,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { MotionConfig } from "motion/react";
import { AboutDialog } from "@/components/about-dialog";
import { ErrorState } from "@/components/error-state";
import { NotFound } from "@/components/not-found";
import { ScreenSize } from "@/components/screen-size";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AboutProvider } from "@/lib/about/context";
import { FilterProvider } from "@/lib/filter/context";
import { PreviewProvider } from "@/lib/preview/context";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { useWebMcp } from "@/lib/webmcp/register";
import appCss from "@/styles.css?url";

// Applies the saved theme before first paint so an SSR'd light shell doesn't
// flash before a dark preference hydrates. Only an explicit localStorage choice
// turns on dark; with no saved value we stay light rather than following the
// system prefers-color-scheme. Static string, no user input.
const themeScript = `try{if(localStorage.theme==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

// Same idea for the list's grid/row preference. The pending list is rendered
// server-side, where localStorage is unreachable, so a row-mode visitor used to
// get the grid layout (288px cards) and watch it swap to rows (144px) once the
// catalog resolved and the real list read the preference. Stamping the value on
// <html> before first paint lets CSS pick the right layout immediately; the
// pending markup renders both variants and shows one, so no measurement or
// hydration pass is involved. Mirrors the localStorage key in index/route.tsx.
const viewScript = `try{var v=localStorage['font-colle.view'];document.documentElement.dataset.view=v==='row'?'row':'grid'}catch(e){document.documentElement.dataset.view='grid'}`;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      // Single light value, no media split: the app always renders light on
      // first paint (dark is opt-in via the toggle and never inherited from the
      // system), so a dark chrome would not match the page underneath it.
      { name: "theme-color", content: "#ffffff" },
      // Social cards. Relative-safe fields are always emitted; og:image and
      // og:url need an absolute origin, so they degrade to nothing when
      // SITE_URL (VITE_SITE_URL) is unset rather than emit a wrong domain.
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: SITE_NAME },
      { property: "og:description", content: SITE_DESCRIPTION },
      // Default share card (name set in the site's mono face); pages override
      // og:image with their own. Absolute URL only, so it degrades when unset.
      ...(absoluteUrl("/og/_default.png")
        ? [
            { property: "og:image", content: absoluteUrl("/og/_default.png") },
            {
              property: "og:image:alt",
              content: `${SITE_NAME}: ${SITE_DESCRIPTION}`,
            },
            { property: "og:image:width", content: "1200" },
            { property: "og:image:height", content: "630" },
            { name: "twitter:image", content: absoluteUrl("/og/_default.png") },
          ]
        : []),
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_NAME },
      { name: "twitter:description", content: SITE_DESCRIPTION },
    ],
    links: [
      // Preload the UI sans (Albert Sans) so it arrives before first paint and
      // the font-display: swap is invisible. Self-hosted at a fixed public path.
      {
        rel: "preload",
        href: "/fonts/albert-sans.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      // Preload the heading face (Host Grotesk) too, it's used for the section
      // titles and headings visible on first paint.
      {
        rel: "preload",
        href: "/fonts/host-grotesk.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      // SVG first for crisp rendering where supported; .ico is the universal
      // fallback (multi-size 16/32/48/64); apple-touch-icon for iOS home screen.
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
      // Point LLMs / AI search tools at the machine-readable guide (field
      // tables, the tag vocabulary, URL params). The llms.txt convention has no
      // registered rel, so use type=text/markdown title=llms.txt — the pattern
      // agents look for. On every page's head, so it's found from any entry.
      {
        rel: "alternate",
        type: "text/markdown",
        href: "/llms.txt",
        title: "llms.txt",
      },
    ],
  }),
  notFoundComponent: () => <NotFound />,
  errorComponent: (props) => <RootError {...props} />,
  shellComponent: RootDocument,
});

// Root error boundary: any loader/render error below the root lands here (e.g.
// a catalog fetch failing or an asset request erroring). Retry re-runs the failed
// loaders (invalidate) and clears the boundary (reset).
function RootError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <ErrorState
      onRetry={() => {
        router.invalidate();
        reset();
      }}
    />
  );
}

// Registers the site's WebMCP tools (search/open a font) with the browser so an
// in-browser AI agent can drive the real UI. Renders nothing, and is a no-op
// unless navigator.modelContext exists — see lib/webmcp/register. Kept as its
// own component because RootDocument also renders during SSR, where hooks that
// touch navigator must not run.
function WebMcpTools() {
  useWebMcp();
  return null;
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static themeScript, no user input; must run blocking in <head> pre-hydration. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static viewScript, no user input; must run blocking in <head> pre-hydration. */}
        <script dangerouslySetInnerHTML={{ __html: viewScript }} />
        <HeadContent />
      </head>
      <body>
        {/* reducedMotion="user" makes every motion/react component honor the
            system prefers-reduced-motion setting (disabling transform/layout
            animations), matching the CSS animations already gated in styles.css. */}
        <MotionConfig reducedMotion="user">
          <TooltipProvider delay={300}>
            <FilterProvider>
              <PreviewProvider>
                <AboutProvider>
                  {children}
                  {/* Mounted here so it overlays whichever page is underneath,
                      leaving that page's icon rail exactly as it was. */}
                  <AboutDialog />
                  <WebMcpTools />
                </AboutProvider>
              </PreviewProvider>
            </FilterProvider>
          </TooltipProvider>
          {/* Global toast host: copy confirmations (e.g. the Glyphs grid) fire
              toast() from anywhere and render here. */}
          <Toaster position="top-center" />
        </MotionConfig>
        {/* Dev-only breakpoint badge. It guards on PROD itself, so it is not
            wrapped in the DEV block below — keeping it outside means it is not
            tied to the devtools' mount. */}
        <ScreenSize />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              {
                name: "Tanstack Query",
                render: <ReactQueryDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
