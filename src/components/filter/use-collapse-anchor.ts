import { useCallback, useRef } from "react";

function scrollParent(el: HTMLElement) {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      /auto|scroll|overlay/.test(overflowY) &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Keeps a toggle button visually still while the block above it collapses.
 * Without this the content below jumps up by the collapsed height.
 */
export function useCollapseAnchor() {
  const ref = useRef<HTMLButtonElement>(null);
  const raf = useRef(0);

  const anchor = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scroller = scrollParent(el);
    if (!scroller) return;

    const top = el.getBoundingClientRect().top;
    const settle = () => {
      const drift = el.getBoundingClientRect().top - top;
      if (drift !== 0) scroller.scrollTop += drift;
    };

    // The height animation settles over several frames, so correct on each one.
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const step = () => {
      settle();
      if (performance.now() - start < 400) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  return { ref, anchor };
}
