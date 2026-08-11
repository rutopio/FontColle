import { useEffect } from "react";

export function useListScrollRestore(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  listScrollY: React.RefObject<number>,
  enabled = true
) {
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;
    const onScroll = () => {
      listScrollY.current = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef, listScrollY, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const target = listScrollY.current;
    if (target <= 0) return;
    let raf = 0;
    const start = performance.now();
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
  }, [scrollRef, listScrollY, enabled]);
}
