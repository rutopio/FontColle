import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

// Keep a scroll container pinned to the top across route changes. The layout
// shell reuses its scroll viewport DOM across list <-> detail navigation, so a
// panel's scroll position could otherwise carry over. Re-zero it on every
// navigation so the filter/detail sidebar always opens at the top. Only touches
// this element, never the window (the list restores its own window scroll).
export function useScrollReset<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not read in the body, re-zero the container whenever the route changes.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [pathname]);

  return ref;
}
