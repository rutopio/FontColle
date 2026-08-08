"use client";

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMountEffect } from "@/hooks/use-mount-effect";

export interface ItemRect {
  top: number;
  height: number;
  left: number;
  width: number;
}

interface UseProximityHoverOptions {
  axis?: "x" | "y" | "xy";
}

interface UseProximityHoverReturn {
  activeIndex: number | null;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
  itemRects: ItemRect[];
  isMeasured: boolean;
  sessionRef: RefObject<number>;
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  registerItem: (index: number, element: HTMLElement | null) => void;
  remeasure: () => void;
  measureItems: () => void;
}

const measurementAttempts = 3;

export function useProximityHover<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseProximityHoverOptions = {}
): UseProximityHoverReturn {
  const { axis = "y" } = options;
  const itemsRef = useRef(new Map<number, HTMLElement>());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [itemRects, setItemRects] = useState<ItemRect[]>([]);
  const [isMeasured, setIsMeasured] = useState(false);
  const itemRectsRef = useRef<ItemRect[]>([]);
  const sessionRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const remeasureRafIdRef = useRef<number | null>(null);

  const runMeasurement = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    const rects: ItemRect[] = [];
    let everyItemHasLayout = true;
    itemsRef.current.forEach((element, index) => {
      const hasLayoutBox =
        element.offsetParent !== null ||
        element.offsetWidth > 0 ||
        element.offsetHeight > 0;
      if (!hasLayoutBox) {
        everyItemHasLayout = false;
        return;
      }
      // offset* is transform-agnostic, matching absolute-positioning space.
      rects[index] = {
        top: element.offsetTop,
        height: element.offsetHeight,
        left: element.offsetLeft,
        width: element.offsetWidth,
      };
    });
    if (!everyItemHasLayout) return false;
    const prev = itemRectsRef.current;
    let changed = prev.length !== rects.length;
    for (let i = 0; !changed && i < rects.length; i++) {
      const p = prev[i];
      const r = rects[i];
      if (p === r) continue;
      changed =
        !p ||
        !r ||
        p.top !== r.top ||
        p.left !== r.left ||
        p.width !== r.width ||
        p.height !== r.height;
    }
    if (changed) {
      itemRectsRef.current = rects;
      setItemRects(rects);
    }
    return true;
  }, [containerRef]);

  const measureItems = useCallback(() => {
    runMeasurement();
  }, [runMeasurement]);

  const scheduleMeasurement = useCallback(
    (attemptsLeft: number) => {
      if (remeasureRafIdRef.current !== null) {
        cancelAnimationFrame(remeasureRafIdRef.current);
      }
      remeasureRafIdRef.current = requestAnimationFrame(() => {
        remeasureRafIdRef.current = null;
        if (runMeasurement()) {
          setIsMeasured(true);
        } else if (attemptsLeft > 1) {
          scheduleMeasurement(attemptsLeft - 1);
        }
      });
    },
    [runMeasurement]
  );

  const remeasure = useCallback(() => {
    setIsMeasured(false);
    scheduleMeasurement(measurementAttempts);
  }, [scheduleMeasurement]);

  const registerItem = useCallback(
    (index: number, element: HTMLElement | null) => {
      if (element) {
        itemsRef.current.set(index, element);
      } else {
        itemsRef.current.delete(index);
      }
      remeasure();
    },
    [remeasure]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();

        if (axis === "xy") {
          let closestIndex: number | null = null;
          let closestDistance = Infinity;
          let containingIndex: number | null = null;

          const rects = itemRectsRef.current;
          const scrollX = container.scrollLeft;
          const scrollY = container.scrollTop;
          const borderX = container.clientLeft;
          const borderY = container.clientTop;
          const scaleX =
            container.offsetWidth > 0
              ? containerRect.width / container.offsetWidth
              : 1;
          const scaleY =
            container.offsetHeight > 0
              ? containerRect.height / container.offsetHeight
              : 1;

          for (let index = 0; index < rects.length; index++) {
            const r = rects[index];
            if (!r) continue;

            const left =
              containerRect.left + (borderX + r.left - scrollX) * scaleX;
            const top =
              containerRect.top + (borderY + r.top - scrollY) * scaleY;
            const width = r.width * scaleX;
            const height = r.height * scaleY;

            if (
              mouseX >= left &&
              mouseX <= left + width &&
              mouseY >= top &&
              mouseY <= top + height
            ) {
              containingIndex = index;
            }

            const dx = mouseX - (left + width / 2);
            const dy = mouseY - (top + height / 2);
            const distance = Math.hypot(dx, dy);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }
          }

          setActiveIndex(containingIndex ?? closestIndex);
          return;
        }

        const mousePos = axis === "x" ? mouseX : mouseY;

        let closestIndex: number | null = null;
        let closestDistance = Infinity;
        let containingIndex: number | null = null;

        const rects = itemRectsRef.current;
        const scrollOffset =
          axis === "x" ? container.scrollLeft : container.scrollTop;
        const borderOffset =
          axis === "x" ? container.clientLeft : container.clientTop;
        const containerEdge =
          axis === "x" ? containerRect.left : containerRect.top;
        // Scale factor: offset* (layout) → viewport coords.
        const layoutSize =
          axis === "x" ? container.offsetWidth : container.offsetHeight;
        const visualSize =
          axis === "x" ? containerRect.width : containerRect.height;
        const scale = layoutSize > 0 ? visualSize / layoutSize : 1;

        for (let index = 0; index < rects.length; index++) {
          const r = rects[index];
          if (!r) continue;

          const contentPos = axis === "x" ? r.left : r.top;
          const itemStart =
            containerEdge + (borderOffset + contentPos - scrollOffset) * scale;
          const itemSize = (axis === "x" ? r.width : r.height) * scale;
          const itemEnd = itemStart + itemSize;

          if (mousePos >= itemStart && mousePos <= itemEnd) {
            containingIndex = index;
          }

          const itemCenter = itemStart + itemSize / 2;
          const distance = Math.abs(mousePos - itemCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }

        setActiveIndex(containingIndex ?? closestIndex);
      });
    },
    [axis, containerRef]
  );

  const handleMouseEnter = useCallback(() => {
    sessionRef.current += 1;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setActiveIndex(null);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() =>
      scheduleMeasurement(measurementAttempts)
    );
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, scheduleMeasurement]);

  useMountEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (remeasureRafIdRef.current !== null) {
        cancelAnimationFrame(remeasureRafIdRef.current);
      }
    };
  });

  return {
    activeIndex,
    setActiveIndex,
    itemRects,
    isMeasured,
    sessionRef,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    registerItem,
    remeasure,
    measureItems,
  };
}

export function useRegisterProximityItem(
  registerItem:
    | ((index: number, element: HTMLElement | null) => void)
    | undefined,
  index: number | undefined,
  ref: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (registerItem == null || index == null) return;
    registerItem(index, ref.current);
    return () => registerItem(index, null);
  }, [index, registerItem, ref]);
}
