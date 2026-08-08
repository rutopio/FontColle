"use client";

import {
    Children,
    forwardRef,
    isValidElement,
    useRef,
    useEffect,
    useState,
    useCallback,
    useMemo,
    createContext,
    useContext,
    type ReactNode,
    type HTMLAttributes,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { Select as SelectPrimitive } from "@base-ui/react/select";
type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
import { cn } from "@/lib/utils";
import { spring, exitFallbackMs } from "@/lib/motion";
import { useProximityHover, useRegisterProximityItem } from "@/hooks/use-proximity-hover";
import { useMountEffect } from "@/hooks/use-mount-effect";

const selectionAckMs = 300;

interface SelectContextValue {
    value: string;
    open: boolean;
    items: { value: string; label: ReactNode }[];
    actionsRef: React.RefObject<{ unmount: () => void } | null>;
}

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelectContext() {
    const ctx = useContext(SelectContext);
    if (!ctx) throw new Error("Select compound components must be inside <Select>");
    return ctx;
}

interface SelectContentContextValue {
    registerItem: (index: number, element: HTMLElement | null) => void;
    activeIndex: number | null;
    checkedIndex?: number;
}

const SelectContentContext =
    createContext<SelectContentContextValue | null>(null);

interface SelectProps {
    children: ReactNode;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    name?: string;
    required?: boolean;
}

function collectSelectItems(
    node: ReactNode,
    out: { value: string; label: ReactNode }[] = []
) {
    Children.forEach(node, (child) => {
        if (!isValidElement(child)) return;
        const props = child.props as { value?: unknown; children?: ReactNode };
        if (typeof props.value === "string") {
            out.push({
                value: props.value,
                label:
                    typeof props.children === "string" ? props.children : props.value,
            });
        } else if (props.children) {
            collectSelectItems(props.children, out);
        }
    });
    return out;
}

function Select({
    children,
    value,
    defaultValue,
    onValueChange,
    disabled = false,
    name,
    required,
}: SelectProps) {
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const [open, setOpen] = useState(false);
    const actionsRef = useRef<{ unmount: () => void } | null>(null);
    const currentValue = value !== undefined ? value : internalValue;

    const items = useMemo(() => collectSelectItems(children), [children]);

    const handleValueChange = useCallback(
        (next: string | null) => {
            const v = next ?? "";
            if (value === undefined) setInternalValue(v);
            onValueChange?.(v);
        },
        [value, onValueChange]
    );

    const ackTimeoutRef = useRef<number | null>(null);
    const cancelAckClose = useCallback(() => {
        if (ackTimeoutRef.current !== null) {
            clearTimeout(ackTimeoutRef.current);
            ackTimeoutRef.current = null;
        }
    }, []);
    useEffect(() => cancelAckClose, [cancelAckClose]);

    const handleOpenChange = useCallback(
        (nextOpen: boolean, eventDetails: { reason: string }) => {
            if (!nextOpen && eventDetails.reason === "item-press") {
                cancelAckClose();
                ackTimeoutRef.current = window.setTimeout(() => {
                    ackTimeoutRef.current = null;
                    setOpen(false);
                }, selectionAckMs);
                return;
            }
            cancelAckClose();
            setOpen(nextOpen);
        },
        [cancelAckClose]
    );

    const ctx = useMemo(
        () => ({ value: currentValue, open, items, actionsRef }),
        [currentValue, open, items]
    );

    return (
        <SelectContext.Provider value={ctx}>
            <SelectPrimitive.Root
                value={currentValue === "" ? null : currentValue}
                onValueChange={handleValueChange}
                open={open}
                onOpenChange={handleOpenChange}
                actionsRef={actionsRef}
                items={items}
                disabled={disabled}
                name={name}
                required={required}
                modal={false}
            >
                {children}
            </SelectPrimitive.Root>
        </SelectContext.Provider>
    );
}

Select.displayName = "Select";

const triggerVariants = cva(
    [
        "group inline-flex items-center justify-between gap-2 outline-none cursor-pointer",
        "text-sm h-9 px-3 min-w-[160px]",
        "transition-all duration-80",
        "disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:ring-1 focus-visible:ring-ring",
    ],
    {
        variants: {
            variant: {
                bordered:
                    "border border-border bg-transparent text-foreground hover:bg-accent",
                borderless:
                    "border border-transparent bg-transparent text-foreground hover:bg-accent",
            },
        },
        defaultVariants: {
            variant: "bordered",
        },
    }
);

interface SelectTriggerProps
    extends Omit<HTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof triggerVariants> {
    icon?: IconComponent;
    placeholder?: string;
    error?: string;
}

const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
    (
        { className, variant, icon: Icon, placeholder = "Select…", error, ...props },
        ref
    ) => {

        return (
            <div className="flex flex-col gap-1">
                <SelectPrimitive.Trigger
                    ref={ref}
                    aria-invalid={!!error || undefined}
                    className={cn(
                        triggerVariants({ variant }),
                        "rounded-lg",
                        error && "border-destructive/50 hover:border-destructive/50",
                        className
                    )}
                    {...props}
                >
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                        {Icon && (
                            <Icon
                                size={16}
                                strokeWidth={1.5}
                                className="shrink-0 text-muted-foreground transition-[color,stroke-width] duration-80 group-hover:text-foreground group-hover:stroke-[2]"
                            />
                        )}
                        <SelectPrimitive.Value
                            placeholder={placeholder}
                            className="min-w-0 flex-1 text-left truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1 data-[placeholder]:text-muted-foreground"
                        />
                    </span>

                    <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 text-muted-foreground transition-colors duration-80 group-hover:text-foreground"
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </SelectPrimitive.Trigger>
                {error && (
                    <span className="text-[12px] text-destructive pl-3">{error}</span>
                )}
            </div>
        );
    }
);

SelectTrigger.displayName = "SelectTrigger";

interface SelectContentProps {
    className?: string;
    children: ReactNode;
}

const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
    ({ className, children }, ref) => {
        const { open, value, items, actionsRef } = useSelectContext();
        const containerRef = useRef<HTMLDivElement>(null);

        const {
            activeIndex,
            setActiveIndex,
            itemRects,
            isMeasured,
            sessionRef,
            handlers,
            registerItem,
            remeasure,
        } = useProximityHover(containerRef);

        const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

        const checkedIndex = useMemo(() => {
            if (!open) return undefined;
            const idx = items.findIndex(item => item.value === value);
            return idx !== -1 ? idx : undefined;
        }, [open, value, items]);

        // Fallback when rAF-driven onAnimationComplete stalls (background tab).
        useEffect(() => {
            if (open) return;
            const id = setTimeout(
                () => actionsRef.current?.unmount(),
                exitFallbackMs(spring.fast)
            );
            return () => clearTimeout(id);
        }, [open, actionsRef]);

        // Items stay registered while hidden; reopen needs an explicit remeasure.
        useEffect(() => {
            if (!open) return;
            remeasure();
        }, [open, remeasure]);

        // Clear stale indices before exit tween finishes — Base UI keeps popup mounted.
        useEffect(() => {
            if (open) return;
            setActiveIndex(null);
            setFocusedIndex(null);
        }, [open, setActiveIndex]);

        const activeRect =
            isMeasured && activeIndex !== null ? itemRects[activeIndex] : null;
        const checkedRect =
            isMeasured && checkedIndex != null ? itemRects[checkedIndex] : null;
        const focusRect =
            isMeasured && focusedIndex !== null ? itemRects[focusedIndex] : null;

        const contentCtx = useMemo(
            () => ({ registerItem, activeIndex, checkedIndex }),
            [registerItem, activeIndex, checkedIndex]
        );

        return (
            <SelectPrimitive.Portal>
                <SelectPrimitive.Positioner
                    side="bottom"
                    align="start"
                    sideOffset={6}
                    alignItemWithTrigger={false}
                    className="z-50 outline-none"
                >
                    <motion.div
                        initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
                        animate={
                            open
                                ? { opacity: 1, y: 0, scaleY: 1 }
                                : { opacity: 0, y: -4, scaleY: 0.96 }
                        }
                        transition={open ? spring.fast : spring.fast.exit}
                        style={{ transformOrigin: "top center" }}
                        onAnimationComplete={() => {
                            if (!open) actionsRef.current?.unmount();
                        }}
                    >
                        <SelectContentContext.Provider value={contentCtx}>
                            <SelectPrimitive.Popup
                                render={
                                    <div
                                        className="bg-popover shadow-md ring-1 ring-foreground/10"
                                        ref={(node: HTMLDivElement | null) => {
                                            (
                                                containerRef as React.MutableRefObject<HTMLDivElement | null>
                                            ).current = node;
                                            if (typeof ref === "function") ref(node);
                                            else if (ref)
                                                (
                                                    ref as React.MutableRefObject<HTMLDivElement | null>
                                                ).current = node;
                                        }}
                                    />
                                }
                                onMouseEnter={() => {
                                    handlers.onMouseEnter();
                                    setFocusedIndex(null);
                                }}
                                onMouseMove={handlers.onMouseMove}
                                onMouseLeave={handlers.onMouseLeave}
                                onFocus={(e) => {
                                    const indexAttr = (e.target as HTMLElement)
                                        .closest("[data-proximity-index]")
                                        ?.getAttribute("data-proximity-index");
                                    if (indexAttr != null) {
                                        const idx = Number(indexAttr);
                                        setActiveIndex(idx);
                                        setFocusedIndex(
                                            (e.target as HTMLElement).matches(":focus-visible")
                                                ? idx
                                                : null
                                        );
                                    }
                                }}
                                onBlur={(e) => {
                                    if (containerRef.current?.contains(e.relatedTarget as Node))
                                        return;
                                    setFocusedIndex(null);
                                    setActiveIndex(null);
                                }}
                                className={cn(
                                    "relative flex flex-col gap-0.5 min-w-[var(--anchor-width)] max-h-[min(300px,var(--available-height))] overflow-y-auto rounded-xl p-1 select-none outline-none",
                                    className
                                )}
                            >
                                {open && (
                                    <AnimatePresence>
                                        {checkedRect && (
                                            <motion.div
                                                className="absolute rounded-lg bg-muted pointer-events-none"
                                                initial={false}
                                                animate={{
                                                    top: checkedRect.top,
                                                    left: checkedRect.left,
                                                    width: checkedRect.width,
                                                    height: checkedRect.height,
                                                    opacity: 1,
                                                }}
                                                exit={{ opacity: 0, transition: spring.moderate.exit }}
                                                transition={{
                                                    ...spring.moderate,
                                                    opacity: { duration: 0.08 },
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>
                                )}

                                {open && (
                                    <AnimatePresence>
                                        {activeRect && (
                                            <motion.div
                                                key={sessionRef.current}
                                                className="absolute rounded-lg bg-muted pointer-events-none"
                                                initial={{
                                                    opacity: 0,
                                                    top: activeRect.top,
                                                    left: activeRect.left,
                                                    width: activeRect.width,
                                                    height: activeRect.height,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    top: activeRect.top,
                                                    left: activeRect.left,
                                                    width: activeRect.width,
                                                    height: activeRect.height,
                                                }}
                                                exit={{ opacity: 0, transition: spring.fast.exit }}
                                                transition={{
                                                    ...spring.fast,
                                                    opacity: { duration: 0.08 },
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>
                                )}

                                {open && (
                                    <AnimatePresence>
                                        {focusRect && (
                                            <motion.div
                                                className="absolute rounded-[10px] pointer-events-none z-20 border border-ring"
                                                initial={false}
                                                animate={{
                                                    left: focusRect.left - 2,
                                                    top: focusRect.top - 2,
                                                    width: focusRect.width + 4,
                                                    height: focusRect.height + 4,
                                                }}
                                                exit={{ opacity: 0, transition: spring.fast.exit }}
                                                transition={{
                                                    ...spring.fast,
                                                    opacity: { duration: 0.08 },
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>
                                )}

                                {children}
                            </SelectPrimitive.Popup>
                        </SelectContentContext.Provider>
                    </motion.div>
                </SelectPrimitive.Positioner>
            </SelectPrimitive.Portal>
        );
    }
);

SelectContent.displayName = "SelectContent";

interface SelectItemProps extends HTMLAttributes<HTMLDivElement> {
    icon?: IconComponent;
    index: number;
    value: string;
    disabled?: boolean;
}

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(
    (
        {
            className,
            children,
            icon: Icon,
            value,
            index,
            disabled = false,
            ...props
        },
        ref
    ) => {
        const selectCtx = useSelectContext();
        const contentCtx = useContext(SelectContentContext);
        const internalRef = useRef<HTMLDivElement>(null);
        const hasMounted = useRef(false);

        useMountEffect(() => {
            hasMounted.current = true;
        });

        useRegisterProximityItem(contentCtx?.registerItem, index, internalRef);

        const isActive = contentCtx?.activeIndex === index;
        const isChecked = selectCtx.value === value;
        const skipAnimation = !hasMounted.current;

        return (
            <SelectPrimitive.Item
                value={value}
                disabled={disabled}
                label={typeof children === "string" ? children : undefined}
                render={
                    <div
                        ref={(node: HTMLDivElement | null) => {
                            (
                                internalRef as React.MutableRefObject<HTMLDivElement | null>
                            ).current = node;
                            if (typeof ref === "function") ref(node);
                            else if (ref)
                                (ref as React.MutableRefObject<HTMLDivElement | null>).current =
                                    node;
                        }}
                        data-proximity-index={index}
                        data-value={value}
                        className={cn(
                            "relative z-10 flex h-9 shrink-0 items-center gap-2 rounded-lg px-2 text-sm cursor-pointer outline-none select-none",
                            "transition-[color] duration-80",
                            isActive || isChecked
                                ? "text-foreground"
                                : "text-muted-foreground",
                            disabled && "opacity-50 pointer-events-none",
                            className
                        )}
                        {...props}
                    />
                }
            >
                {Icon && (
                    <Icon
                        size={16}
                        strokeWidth={isActive || isChecked ? 2 : 1.5}
                        className="shrink-0 transition-[color,stroke-width] duration-80"
                    />
                )}

                <SelectPrimitive.ItemText
                    render={<span className="flex-1 min-w-0 truncate [text-box:trim-both_cap_alphabetic] py-1 -my-1" />}
                >
                    {children}
                </SelectPrimitive.ItemText>

                <span aria-hidden className="shrink-0 w-4 h-4">
                    <AnimatePresence>
                        {isChecked && (
                            <motion.svg
                                key="check"
                                width={16}
                                height={16}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-foreground"
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 1 }}
                            >
                                <motion.path
                                    d="M4 12L9 17L20 6"
                                    initial={{ pathLength: skipAnimation ? 1 : 0 }}
                                    animate={{
                                        pathLength: 1,
                                        transition: { duration: 0.08, ease: "easeOut" },
                                    }}
                                    exit={{
                                        pathLength: 0,
                                        transition: { duration: 0.04, ease: "easeIn" },
                                    }}
                                />
                            </motion.svg>
                        )}
                    </AnimatePresence>
                </span>
            </SelectPrimitive.Item>
        );
    }
);

SelectItem.displayName = "SelectItem";

function SelectGroup({
    children,
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div role="group" className={className} {...props}>
            {children}
        </div>
    );
}

SelectGroup.displayName = "SelectGroup";

const SelectLabel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "px-2 py-1.5 shrink-0 text-2xs text-muted-foreground",
                className
            )}
            {...props}
        />
    )
);

SelectLabel.displayName = "SelectLabel";

const SelectSeparator = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        role="separator"
        className={cn("my-1 -mx-1 h-px shrink-0 bg-border/60", className)}
        {...props}
    />
));

SelectSeparator.displayName = "SelectSeparator";

export {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
    SelectSeparator,
    triggerVariants,
};

export type { SelectProps, SelectTriggerProps, SelectContentProps, SelectItemProps };
