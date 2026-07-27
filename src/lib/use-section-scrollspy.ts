import { useCallback, useEffect, useRef } from "react";

// A section claims the rail once its top is within this many pixels of the
// viewport top — larger than the panel's own padding, so it takes over a moment
// before its heading is flush to the edge, which is where the eye already is.
const ACTIVE_THRESHOLD_PX = 88;

// Measured from the two rects rather than offsetTop, which is relative to the
// nearest positioned ancestor — here the ScrollArea root, not the viewport.
function offsetOf(viewport: HTMLElement, el: HTMLElement) {
  return (
    el.getBoundingClientRect().top -
    viewport.getBoundingClientRect().top +
    viewport.scrollTop
  );
}

/**
 * The report goes up and the jump comes back down through the same piece of
 * state, so `lastReported` tells them apart: an incoming id the spy itself just
 * published is already in view and issues no scroll.
 */
export function useSectionScrollspy<Id extends string>({
  viewportRef,
  ids,
  active,
  onActiveChange,
  enabled,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  ids: readonly Id[];
  // A value the spy did not report is treated as a jump request.
  active: Id;
  onActiveChange: (id: Id) => void;
  // False while the panel shows something other than the stacked sections.
  enabled: boolean;
}) {
  const sections = useRef(new Map<Id, HTMLElement>());
  const lastReported = useRef<Id | null>(null);
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  const registerSection = useCallback((id: Id, el: HTMLElement | null) => {
    if (el) sections.current.set(id, el);
    else sections.current.delete(id);
  }, []);

  const scrollToSection = useCallback(
    (id: Id) => {
      const viewport = viewportRef.current;
      const el = sections.current.get(id);
      if (!viewport || !el) return;
      // Instant, not animated: setting scrollTop lands before the next scroll
      // event, so `lastReported` below covers the destination and the sections
      // swept past are never each published in turn.
      viewport.scrollTop = Math.max(0, offsetOf(viewport, el) - 16);
      lastReported.current = id;
    },
    [viewportRef]
  );

  useEffect(() => {
    if (!enabled) return;
    if (lastReported.current === active) return;
    scrollToSection(active);
  }, [active, enabled, scrollToSection]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !enabled) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rendered = ids.filter((id) => sections.current.has(id));
      if (rendered.length === 0) return;

      // Bottom of the scroll: the last section wins outright. Short trailing
      // sections can never reach the threshold, so without this the rail would
      // stick on whichever section happens to be tall enough to fill the view.
      const atEnd =
        viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2;
      let next = rendered[0];
      if (atEnd) {
        next = rendered[rendered.length - 1];
      } else {
        for (const id of rendered) {
          const el = sections.current.get(id);
          if (!el) continue;
          const top =
            el.getBoundingClientRect().top -
            viewport.getBoundingClientRect().top;
          if (top <= ACTIVE_THRESHOLD_PX) next = id;
        }
      }

      if (next === lastReported.current) return;
      lastReported.current = next;
      onActiveChangeRef.current(next);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [viewportRef, ids, enabled]);

  return { registerSection, scrollToSection };
}
