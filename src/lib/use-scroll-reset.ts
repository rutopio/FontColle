import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export function useScrollReset<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a trigger dep — not read in the body, but a route change must re-zero the scroll position.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [pathname]);

  return ref;
}
