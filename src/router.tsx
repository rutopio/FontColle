import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // One QueryClient per router instance (per request on the server, once on the
  // client). Powers the on-demand fetches that aren't route loaders — currently
  // just per-font glyph coverage — with caching + SSR dehydration.
  const queryClient = new QueryClient();

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },

    // Off on purpose. The list page restores the window scroll itself (the
    // listScrollY logic in routes/index) with a frame-retry that waits for the
    // virtualizer to grow to full height — router restoration can't, and fought
    // it (partial offsets). With it off, inner containers like the sidebar also
    // aren't restored, so they naturally open at the top.
    scrollRestoration: false,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  // Dehydrate/hydrate the QueryClient across the SSR boundary and inject the
  // QueryClientProvider (wrapQueryClient defaults on), so __root needs no change.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
