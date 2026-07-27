import { useEffect } from "react";

// Remember the list's scroll position and restore it when returning from a
// detail page. The list scrolls inside the Column's ScrollArea viewport, not
// the window. A one-shot restore does not work: the virtualizer grows its total
// height over the first frames, so the target isn't reachable immediately, and
// it resets scrollTop as it measures. Hence re-asserting across a time budget,
// stopping when the budget elapses rather than when the target is first hit.
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
    // ~600ms: long enough to outlast the virtualizer's resets, short enough
    // that a user who immediately scrolls elsewhere isn't fought for long.
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
