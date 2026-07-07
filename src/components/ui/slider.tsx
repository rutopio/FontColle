"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
    className,
    ...props
}: SliderPrimitive.Root.Props<number>) {
    return (
        <SliderPrimitive.Root
            data-slot="slider"
            className={cn("relative flex w-full touch-none items-center", className)}
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
                        data-slot="slider-thumb"
                        className="block size-4 rounded-full border border-foreground bg-background shadow-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    />
                </SliderPrimitive.Track>
            </SliderPrimitive.Control>
        </SliderPrimitive.Root>
    );
}

export { Slider };
