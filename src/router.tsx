import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // One per router instance: per request on the server, once on the client.
  // Powers the on-demand fetches that aren't route loaders.
  const queryClient = new QueryClient();

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },

    // Off on purpose: the list restores its own scroll (see
    // use-list-scroll-restore) with a frame-retry that waits for the
    // virtualizer to reach full height. Router restoration can't do that and
    // fought it, landing on partial offsets. With it off, inner containers
    // like the sidebar also open at the top, which is what we want.
    scrollRestoration: false,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // The catalog is static within a session, so back-navigation should reuse
    // it. At the default 0 every back-navigation revalidates the loader, and
    // the refetch commit re-mounts the route, replaying the RouteFade entry as
    // a stray second flash ~1.5s after landing.
    defaultStaleTime: 5 * 60_000,
  });

  // Dehydrates across the SSR boundary and injects the QueryClientProvider,
  // so __root needs no wrapper of its own.
  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
