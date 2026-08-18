import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type Direction = "up" | "down" | null;

/** Deliberately slower than shared springs — must be noticeable, not a flicker. */
const ROLL = {
  type: "spring" as const,
  duration: 0.55,
  bounce: 0.18,
  exit: { duration: 0.4 },
} as const;

export function CountFlash({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  // Pin direction to the value that produced it (useDeferredValue re-renders break bare refs).
  const [seen, setSeen] = useState({ value, direction: null as Direction });
  if (seen.value !== value) {
    setSeen({ value, direction: value > seen.value ? "up" : "down" });
  }
  const direction = seen.value === value ? seen.direction : null;

  const offset = direction === "down" ? -14 : 14;

  return (
    <span
      className={`relative inline-grid overflow-hidden tabular-nums ${className}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: offset }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -offset }}
          transition={ROLL}
          className="col-start-1 row-start-1"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
