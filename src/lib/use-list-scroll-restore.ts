import { useEffect } from "react";

// Remember the window scroll while browsing the list, and restore it when
// returning from a detail page. Two obstacles the naive one-shot restore hits:
// the window virtualizer grows its total height over the first frames (so the
// target isn't reachable immediately), and it resets the window scroll as it
// mounts/measures (so a one-shot restore gets clobbered). So we keep
// re-asserting the target across a short time budget, stopping only once the
// budget elapses — not the first time it's reached.
export function useListScrollRestore(listScrollY: React.RefObject<number>) {
  // Track the current scroll position while on the list.
  useEffect(() => {
    const onScroll = () => {
      listScrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [listScrollY]);

  // Restore on mount (returning from detail).
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount.
  useEffect(() => {
    const target = listScrollY.current;
    if (target <= 0) return;
    let raf = 0;
    const start = performance.now();
    // Re-assert the target for a fixed budget: the virtualizer resets the window
    // scroll a few times as it mounts and measures, so a "stop once reached"
    // restore gets clobbered afterward. Hold the target for ~600ms — long enough
    // to outlast those resets, short enough that a user who immediately scrolls
    // elsewhere isn't fought for long.
    const tick = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const goal = Math.min(target, max);
      if (Math.abs(window.scrollY - goal) > 1) window.scrollTo(0, goal);
      if (performance.now() - start < 600) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
}
