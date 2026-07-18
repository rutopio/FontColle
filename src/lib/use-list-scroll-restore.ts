import { useEffect } from "react";

// Remember the list's scroll position while browsing, and restore it when
// returning from a detail page. The list scrolls inside a container (the
// Column's ScrollArea viewport), not the window, so this tracks that element's
// scrollTop. Two obstacles the naive one-shot restore hits: the virtualizer
// grows its total height over the first frames (so the target isn't reachable
// immediately), and it resets scrollTop as it mounts/measures (so a one-shot
// restore gets clobbered). So we keep re-asserting the target across a short
// time budget, stopping only once the budget elapses, not the first time it's
// reached.
export function useListScrollRestore(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  listScrollY: React.RefObject<number>
) {
  // Track the current scroll position while on the list.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      listScrollY.current = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, listScrollY]);

  // Restore on mount (returning from detail).
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount.
  useEffect(() => {
    const target = listScrollY.current;
    if (target <= 0) return;
    let raf = 0;
    const start = performance.now();
    // Re-assert the target for a fixed budget: the virtualizer resets scrollTop
    // a few times as it mounts and measures, so a "stop once reached" restore
    // gets clobbered afterward. Hold the target for ~600ms, long enough to
    // outlast those resets, short enough that a user who immediately scrolls
    // elsewhere isn't fought for long.
    const tick = () => {
      const el = scrollRef.current;
      if (el) {
        const max = el.scrollHeight - el.clientHeight;
        const goal = Math.min(target, max);
        if (Math.abs(el.scrollTop - goal) > 1) el.scrollTop = goal;
      }
      if (performance.now() - start < 600) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
