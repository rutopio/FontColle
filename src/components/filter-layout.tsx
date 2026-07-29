import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import type { Ref } from "react";
import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import {
  FilterPanelColumn,
  FilterRailColumn,
} from "@/components/filter-columns";
import { LogoIcon } from "@/components/logo-icon";
import { RouteFade } from "@/components/route-fade";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EASE_OUT, MOTION_S } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

function MobileTopBar({ favoriteFontId }: { favoriteFontId?: string }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-border border-b bg-background px-3 md:hidden">
      <Link
        to="/"
        aria-label="FontColle, all fonts"
        className="flex items-center gap-1.5 text-primary"
      >
        <LogoIcon className="size-5" />
        <span className="font-mono text-xs">FontColle</span>
      </Link>
      <div className="flex items-center gap-1">
        <FavoriteToggle fontId={favoriteFontId} variant="bar" />
        <ThemeToggle variant="bar" />
        <AboutLink variant="bar" />
      </div>
    </div>
  );
}

/* Actual rendered widths of the two fixed columns. Main takes what is left via
   flex-1, so neither value is derived from the other or from a shell total. */
const SHELL_WIDTHS = {
  "--rail-width": "4.5rem",
  "--panel-width": "20rem",
} as React.CSSProperties;

export function FilterLayout({
  rail,
  sidebar,
  children,
  header,
  favoriteFontId,
}: {
  rail?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  header?: React.ReactNode;
  favoriteFontId?: string;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only fixed top-2 left-2 z-[100] -translate-y-full rounded-md bg-background px-4 py-2 font-medium text-sm shadow ring-2 ring-ring transition-transform focus:not-sr-only focus:translate-y-0"
      >
        Skip to content
      </a>
      <div
        className="container relative flex h-full flex-col md:gap-2"
        style={SHELL_WIDTHS}
      >
        <MobileTopBar favoriteFontId={favoriteFontId} />
        {header ? (
          <div className="relative z-20 shrink-0">
            <ColumnHeader>{header}</ColumnHeader>
          </div>
        ) : null}
        <div className="relative flex min-h-0 flex-1 gap-2">
          <FilterRailColumn>
            {rail ? <RouteFade>{rail}</RouteFade> : null}
          </FilterRailColumn>
          <AnimatePresence initial={false}>
            {sidebar ? (
              <motion.div
                key="panel"
                className="flex h-full min-h-0 shrink-0 flex-col overflow-hidden"
                initial={{ width: 0, opacity: 0 }}
                animate={{
                  width: "var(--panel-width)",
                  opacity: 1,
                  transition: {
                    duration: MOTION_S.slow,
                    ease: EASE_OUT,
                    opacity: {
                      duration: MOTION_S.base,
                      delay: 0.06,
                      ease: EASE_OUT,
                    },
                  },
                }}
                exit={{
                  width: 0,
                  opacity: 0,
                  transition: {
                    duration: MOTION_S.slow,
                    ease: EASE_OUT,
                    opacity: { duration: MOTION_S.fast, ease: EASE_OUT },
                  },
                }}
              >
                <FilterPanelColumn>
                  <RouteFade className="flex min-h-0 w-full flex-1 flex-col">
                    {sidebar}
                  </RouteFade>
                </FilterPanelColumn>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <div className="flex min-w-0 flex-1 flex-col">
            <RouteFade distance={16} className="flex min-h-0 flex-1 flex-col">
              {children}
            </RouteFade>
          </div>
        </div>
      </div>
    </>
  );
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex shrink-0 items-center gap-2 max-md:mt-0 md:py-0">
      <Link
        to="/"
        aria-label="FontColle, all fonts"
        className="group/logo hidden w-(--rail-width) shrink-0 flex-col items-center justify-center gap-1 rounded-xl p-2 text-primary outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring md:flex dark:hover:bg-white/6"
      >
        <LogoIcon className="size-7" />
        {/* <span className="font-mono text-[9px] group-hover/logo:font-bold">
                    FontColle
                </span> */}
      </Link>
      <div className="flex flex-1 flex-wrap items-center gap-3 md:flex-nowrap">
        {children}
      </div>
    </header>
  );
}

export function Column({
  subheader,
  footer,
  footerHidden = false,
  children,
  scrollViewportRef,
}: {
  subheader?: React.ReactNode;
  footer?: React.ReactNode;
  footerHidden?: boolean;
  children: React.ReactNode;
  scrollViewportRef?: Ref<HTMLDivElement>;
}) {
  const footerEl = footer ? (
    <motion.footer
      initial={false}
      animate={
        footerHidden ? { height: 0, y: "100%" } : { height: "4rem", y: "0%" }
      }
      transition={{ duration: MOTION_S.base, ease: EASE_OUT }}
      className={cn(
        "flex shrink-0 items-center gap-2 overflow-hidden bg-background p-2",
        footerHidden ? "border-t-0" : "border-border border-t"
      )}
    >
      <div className="flex flex-1 items-center gap-3">{footer}</div>
    </motion.footer>
  ) : null;

  const body = (
    <div
      id="main"
      className={cn(
        "scroll-mt-20",
        "mx-auto flex min-h-full w-full flex-col gap-4 p-4 md:gap-6 md:p-4",
        footerEl ? "pb-6" : "pb-24"
      )}
    >
      {children}
    </div>
  );

  return (
    <div className="relative min-w-0 flex-1">
      <div className="absolute inset-0 flex flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-background md:overflow-hidden md:rounded-lg md:border md:border-border">
          {subheader}
          <ScrollArea
            viewportRef={scrollViewportRef}
            className="min-h-0 flex-1"
          >
            {body}
          </ScrollArea>
          {footerEl}
        </div>
      </div>
    </div>
  );
}
