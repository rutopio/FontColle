import { useCallback, useEffect, useRef } from "react";

// A section counts as "current" once its top has risen to within this many
// pixels of the viewport's top. Larger than the panel's own padding so a
// section claims the rail a moment before its heading is flush to the edge,
// which is where the eye already is.
const ACTIVE_THRESHOLD_PX = 88;

// How long to ignore the spy after a jump, if the browser never fires scrollend
// (Safari < 26). Long enough for a smooth scroll across the whole panel.
const SCROLL_SETTLE_MS = 700;

// Distance from the top of the scrollable content to this section's top.
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
 * Scroll-spy for a panel that stacks every section in one scroll: reports which
 * section is at the top of the viewport, and jumps to a section on request.
 *
 * The spy reports upward and the jump comes back down through the same piece of
 * state, so the caller has to be able to tell the two apart or a jump would
 * re-trigger itself. `lastReported` is that tell: when the incoming id is one
 * the spy itself just published, the section is already in view and no scroll is
 * issued. Anything else is a real request from the rail.
 */
export function useFilterScrollspy<Id extends string>({
  viewportRef,
  ids,
  active,
  onActiveChange,
  enabled,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  // Section ids, in the order they are rendered.
  ids: readonly Id[];
  // The id the caller currently holds; a value the spy did not report is
  // treated as a jump request.
  active: Id;
  onActiveChange: (id: Id) => void;
  // False while the panel shows something other than the stacked sections (the
  // Preset panel), where there is nothing to spy on or scroll to.
  enabled: boolean;
}) {
  const sections = useRef(new Map<Id, HTMLElement>());
  const lastReported = useRef<Id | null>(null);
  // Set while a jump is animating: the spy would otherwise report every section
  // the scroll passes over and strobe the rail highlight on the way.
  const jumping = useRef(false);
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
      jumping.current = true;
      viewport.scrollTo({
        top: Math.max(0, offsetOf(viewport, el) - 16),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    [viewportRef]
  );

  // Jump when the caller hands us an id the spy did not just report.
  useEffect(() => {
    if (!enabled) return;
    if (lastReported.current === active) return;
    scrollToSection(active);
  }, [active, enabled, scrollToSection]);

  // Report the topmost section that has scrolled past the threshold.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !enabled) return;

    let frame = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;

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
      // A jump is animating: hold the highlight at the destination rather than
      // reporting each section the scroll sweeps past.
      if (jumping.current) {
        clearTimeout(settle);
        settle = setTimeout(() => {
          jumping.current = false;
        }, SCROLL_SETTLE_MS);
        return;
      }
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    const onScrollEnd = () => {
      jumping.current = false;
      clearTimeout(settle);
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    viewport.addEventListener("scrollend", onScrollEnd);
    // Seed the highlight from wherever the panel opens.
    measure();
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      viewport.removeEventListener("scrollend", onScrollEnd);
      if (frame) cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [viewportRef, ids, enabled]);

  return { registerSection, scrollToSection };
}
