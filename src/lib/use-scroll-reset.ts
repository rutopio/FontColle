import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export function useScrollReset<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not read in the body, re-zero the container whenever the route changes.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [pathname]);

  return ref;
}
