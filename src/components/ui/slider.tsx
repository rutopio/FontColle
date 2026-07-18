"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
    className,
    size = "default",
    ...props
}: SliderPrimitive.Root.Props<number> & {
    // "sm" matches range-slider's 12px thumb, for the narrow sidebar columns
    // where a 16px one reads heavy. "default" is the roomier 16px control used
    // on full-width surfaces like the Use page.
    size?: "default" | "sm";
}) {
    const sm = size === "sm";
    return (
        <SliderPrimitive.Root
            data-slot="slider"
            className={cn("relative flex w-full touch-none items-center", className)}
            {...props}
        >
            {/* Horizontal padding = half the thumb, so the track ends inset by the
                thumb radius and the thumb sits inside the slider's own box instead
                of spilling past its edge at the 0%/100% positions, where a clipping
                ancestor (e.g. an animating Collapsible) would cut it off. */}
            <SliderPrimitive.Control
                data-slot="slider-control"
                className={cn(
                    "flex w-full items-center py-2",
                    sm ? "px-1.5" : "px-2"
                )}
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
                        data-slot="slider-thumb"
                        className={cn(
                            "block rounded-full border border-foreground bg-background shadow-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                            sm ? "size-3" : "size-4"
                        )}
                    />
                </SliderPrimitive.Track>
            </SliderPrimitive.Control>
        </SliderPrimitive.Root>
    );
}

export { Slider };
