import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

// Keep a scroll container pinned to the top across route changes. Router
// scrollRestoration (kept on for the window/list) also restores inner scroll
// containers like the sidebar, which should always open at the top. We can't
// opt one element out, so re-zero it after each navigation. The restore can
// land a frame or two late on back/forward, so re-zero across a few frames to
// win that race. Only touches this element — never the window.
export function useScrollReset<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not read in the body — re-zero the container whenever the route changes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let frames = 0;
    const tick = () => {
      el.scrollTop = 0;
      if (++frames < 3) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return ref;
}
