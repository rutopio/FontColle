import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    // Off on purpose. The list page restores the window scroll itself (the
    // listScrollY logic in routes/index) with a frame-retry that waits for the
    // virtualizer to grow to full height — router restoration can't, and fought
    // it (partial offsets). With it off, inner containers like the sidebar also
    // aren't restored, so they naturally open at the top.
    scrollRestoration: false,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
