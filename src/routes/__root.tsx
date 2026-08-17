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
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from "@/lib/site-meta";
import { useWebMcp } from "@/lib/webmcp/register";
import appCss from "@/styles.css?url";

// Blocking scripts in <head> prevent theme/view FOUC.
// Light is the default: dark applies only when the user has explicitly turned
// it on, never from prefers-color-scheme. The same script rewrites the
// theme-color meta so browser chrome follows the page rather than the OS —
// without it a system-dark device got dark chrome around a light page.
const themeScript = `try{var d=localStorage['font-fridge.theme']==='dark';if(d)document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=d?'${THEME_COLOR_DARK}':'${THEME_COLOR_LIGHT}'}catch(e){}`;
const viewScript = `try{var v=localStorage['font-fridge.view'];document.documentElement.dataset.view=v==='row'?'row':'grid'}catch(e){document.documentElement.dataset.view='grid'}`;
// Grid density, same reasoning as viewScript: the pending list renders before
// React can read localStorage, so the column cap is stamped on <html> and the
// SSR skeleton follows it via CSS. Anything outside 1/2/4 falls back to 3.
const colsScript = `try{var c=localStorage['font-fridge.cols'];document.documentElement.dataset.cols=(c==='1'||c==='2'||c==='4')?c:'3'}catch(e){document.documentElement.dataset.cols='3'}`;

// Public site identifier, not a secret: it ships in the HTML of every page and
// only tells the beacon which Web Analytics site to report to.
const CF_BEACON_TOKEN = "43a47f0f85b94210a51857053ea45086";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      // Light unless the user opted into dark, matching the page itself. A
      // single unscoped tag, not a per-scheme pair: themeScript rewrites this
      // to #0a0a0a when the stored preference is dark, so the value tracks the
      // stored choice instead of the OS setting.
      { name: "theme-color", content: THEME_COLOR_LIGHT },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: SITE_NAME },
      { property: "og:description", content: SITE_DESCRIPTION },
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
      {
        rel: "preload",
        href: "/fonts/albert-sans.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/host-grotesk.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
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
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static colsScript, no user input; must run blocking in <head> pre-hydration. */}
        <script dangerouslySetInnerHTML={{ __html: colsScript }} />
        <HeadContent />
      </head>
      <body>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={300}>
            <FilterProvider>
              <PreviewProvider>
                <AboutProvider>
                  {children}
                  <AboutDialog />
                  <WebMcpTools />
                </AboutProvider>
              </PreviewProvider>
            </FilterProvider>
          </TooltipProvider>
          <Toaster position="top-center" />
        </MotionConfig>
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
        {/* Cloudflare Web Analytics. The automatic edge injection that proxied
            sites get does not apply here: this origin is a Worker Custom Domain,
            and Cloudflare does not rewrite a Worker's own response body, so the
            beacon has to be in the document. PROD-only so local runs and
            previews stay out of the numbers. */}
        {import.meta.env.PROD && (
          <script
            type="module"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${CF_BEACON_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
