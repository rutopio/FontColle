import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import type { Ref } from "react";
import { AboutLink } from "@/components/about-link";
import { AppSidebar } from "@/components/app-sidebar";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { LogoIcon } from "@/components/logo-icon";
import { RouteFade } from "@/components/route-fade";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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

const SHELL_WIDTHS = {
  "--sidebar-width-icon": "5rem",
  "--sidebar-width": "25rem",
} as React.CSSProperties;

export function FilterLayout({
  rail,
  sidebar,
  children,
  header,
  panelOpen = true,
  favoriteFontId,
}: {
  rail?: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  header?: React.ReactNode;
  panelOpen?: boolean;
  favoriteFontId?: string;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only fixed top-2 left-2 z-[100] -translate-y-full rounded-md bg-background px-4 py-2 font-medium text-sm shadow ring-2 ring-sidebar-ring transition-transform focus:not-sr-only focus:translate-y-0"
      >
        Skip to content
      </a>
      <div
        className="container relative flex h-full flex-col"
        style={SHELL_WIDTHS}
      >
        <MobileTopBar favoriteFontId={favoriteFontId} />
        {header ? (
          <div className="relative z-20 shrink-0 md:mr-2 md:ml-[calc(var(--sidebar-width-icon)+0.5rem)]">
            <ColumnHeader>{header}</ColumnHeader>
          </div>
        ) : null}
        <SidebarProvider
          className="relative min-h-0 flex-1 md:-mt-18"
          open={panelOpen}
          style={SHELL_WIDTHS}
        >
          <AppSidebar rail={rail ? <RouteFade>{rail}</RouteFade> : undefined}>
            <AnimatePresence initial={false}>
              {sidebar ? (
                <motion.div
                  key="panel"
                  className="flex min-h-0 w-full flex-1 flex-col"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: MOTION_S.fast, ease: EASE_OUT }}
                >
                  <RouteFade className="flex min-h-0 w-full flex-1 flex-col">
                    {sidebar}
                  </RouteFade>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </AppSidebar>
          <SidebarInset className="min-w-0 md:mt-20 md:mr-2 md:mb-2 md:ml-0 md:bg-transparent md:peer-data-[state=collapsed]:ml-2">
            <RouteFade distance={16} className="flex min-h-0 flex-1 flex-col">
              {children}
            </RouteFade>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="mt-2 flex min-h-16 shrink-0 items-center gap-2 border-border max-md:mt-0 md:h-16 md:py-0">
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
        <div className="flex min-h-0 flex-1 flex-col bg-background md:overflow-hidden md:rounded-xl md:border md:border-border">
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
