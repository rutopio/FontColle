import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type Direction = "up" | "down" | null;

/**
 * Slower than the shared spring tokens on purpose: this is a passive readout in
 * the corner of the eye, so the roll needs to last long enough to be noticed
 * rather than register as a flicker. A little bounce sells the travel.
 */
const ROLL = {
  type: "spring" as const,
  duration: 0.55,
  bounce: 0.18,
  exit: { duration: 0.4 },
} as const;

/**
 * A number that rolls when it changes: the outgoing value slides away in the
 * direction of travel and the incoming one slides in behind it.
 */
export function CountFlash({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  // Direction is pinned to the value that produced it. Deriving it from a bare
  // "previous" ref breaks here: the count arrives through useDeferredValue, so
  // the component re-renders after the swap and the comparison collapses to
  // equal before the keyed child has mounted with its initial state.
  const [seen, setSeen] = useState({ value, direction: null as Direction });
  if (seen.value !== value) {
    setSeen({ value, direction: value > seen.value ? "up" : "down" });
  }
  const direction = seen.value === value ? seen.direction : null;

  // Rising counts travel up out of the slot, falling counts travel down.
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
