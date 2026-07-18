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
import { ErrorState } from "@/components/error-state";
import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FilterProvider } from "@/lib/filter/context";
import { PreviewProvider } from "@/lib/preview/context";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import appCss from "../styles.css?url";

// Applies the effective theme before first paint so an SSR'd light shell doesn't
// flash before a dark preference hydrates. An explicit localStorage choice wins;
// with no saved value we fall back to the system prefers-color-scheme. Static
// string, no user input.
const themeScript = `try{var t=localStorage.theme;if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      // Theme-color per scheme: the app defaults to light (white chrome) and
      // dark is opt-in, so the browser UI should match rather than always be
      // black. media picks the right one for the user's system preference.
      {
        name: "theme-color",
        content: "#ffffff",
        media: "(prefers-color-scheme: light)",
      },
      {
        name: "theme-color",
        content: "#0a0a0a",
        media: "(prefers-color-scheme: dark)",
      },
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
              content: `${SITE_NAME} — ${SITE_DESCRIPTION}`,
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
      // Preload the heading face (Host Grotesk) too — it's used for the section
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
    ],
  }),
  notFoundComponent: () => <NotFound />,
  errorComponent: (props) => <RootError {...props} />,
  shellComponent: RootDocument,
});

// Root error boundary: any loader/render error below the root lands here (e.g.
// getAllFonts failing or a slow D1 query erroring). Retry re-runs the failed
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static themeScript, no user input; must run blocking in <head> pre-hydration. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {/* reducedMotion="user" makes every motion/react component honor the
            system prefers-reduced-motion setting (disabling transform/layout
            animations), matching the CSS animations already gated in styles.css. */}
        <MotionConfig reducedMotion="user">
          <TooltipProvider delay={300}>
            <FilterProvider>
              <PreviewProvider>{children}</PreviewProvider>
            </FilterProvider>
          </TooltipProvider>
          {/* Global toast host: copy confirmations (e.g. the Glyphs grid) fire
              toast() from anywhere and render here. */}
          <Toaster position="top-center" />
        </MotionConfig>
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
