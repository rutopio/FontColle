"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

// A two-thumb range slider. Separate from the single-thumb Slider because a
// range needs explicit indexed thumbs (base-ui requires this for SSR) and its
// value is a [lo, hi] tuple. Styling mirrors ui/slider.tsx.
function RangeSlider({
  className,
  getAriaLabel,
  ...props
}: SliderPrimitive.Root.Props<readonly number[]> & {
  // aria-label per thumb index (0 = lower, 1 = upper).
  getAriaLabel?: (index: number) => string;
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Control
        data-slot="slider-control"
        className="flex w-full items-center py-2"
      >
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1.5 w-full grow rounded-full bg-muted"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-indicator"
            className="absolute h-full rounded-full bg-foreground"
          />
          <SliderPrimitive.Thumb
            index={0}
            getAriaLabel={getAriaLabel}
            data-slot="slider-thumb"
            className="block size-3 rounded-full border border-foreground bg-background shadow-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <SliderPrimitive.Thumb
            index={1}
            getAriaLabel={getAriaLabel}
            data-slot="slider-thumb"
            className="block size-3 rounded-full border border-foreground bg-background shadow-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { RangeSlider };
