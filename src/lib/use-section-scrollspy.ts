import { useCallback, useEffect, useRef } from "react";

const ACTIVE_THRESHOLD_PX = 88;

function offsetOf(viewport: HTMLElement, el: HTMLElement) {
  return (
    el.getBoundingClientRect().top -
    viewport.getBoundingClientRect().top +
    viewport.scrollTop
  );
}

export function useSectionScrollspy<Id extends string>({
  viewportRef,
  ids,
  active,
  onActiveChange,
  enabled,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  ids: readonly Id[];
  active: Id;
  onActiveChange: (id: Id) => void;
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
