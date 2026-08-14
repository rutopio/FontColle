import { ArrowLeftIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { FontTraits } from "@/components/font-traits";
import { GithubLink } from "@/components/github-link";
import {
  HeaderButtonGroup,
  HeaderButtonGroupItem,
} from "@/components/header-button-group";
import {
  RAIL_BTN_OFF,
  RAIL_HEADER_BTN,
  RAIL_HEADER_CELL,
} from "@/components/rail-button";
import { repoHostIcon } from "@/components/repo-host-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { emptyFilter } from "@/lib/fonts/filter/state";
import type { FontRecord } from "@/lib/fonts/types";
import { backWithViewTransition } from "@/lib/view-transition";

export function DetailHeader({ font }: { font: FontRecord }) {
  const router = useRouter();
  // Deferred to avoid hydration mismatch (server can't read browser history).
  const [mounted, setMounted] = useState(false);
  useMountEffect(() => setMounted(true));
  const canGoBack = useCanGoBack() && mounted;

  const RepoIcon = repoHostIcon(font.repositoryUrl);

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(font.name);
      toast.success("Copied font name", { description: font.name });
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <>
      <div className="flex w-full min-w-0 items-center gap-1 md:w-auto">
        <div className={RAIL_HEADER_CELL}>
          {canGoBack ? (
            <button
              type="button"
              aria-label="Back to all fonts"
              onClick={() =>
                backWithViewTransition(() => router.history.back())
              }
              className={`${RAIL_HEADER_BTN} ${RAIL_BTN_OFF}`}
            >
              <ArrowLeftIcon className="size-5 shrink-0" />
            </button>
          ) : (
            <Link
              to="/"
              viewTransition
              aria-label="Back to all fonts"
              className={`${RAIL_HEADER_BTN} ${RAIL_BTN_OFF}`}
            >
              <ArrowLeftIcon className="size-5 shrink-0" />
            </Link>
          )}
        </div>
        <Separator aria-hidden orientation="vertical" className="mx-2 h-5" />
        {/* Name and designer scroll together as one strip: they read as a
            single line, so scrolling them independently would let the two drift
            out of step. The scroller is this wrapper, never the button inside
            it, since dragging to scroll on a button would fire the copy. */}
        <div className="flex min-w-0 items-baseline gap-2 overflow-x-auto">
          <h1 className="shrink-0 font-semibold text-lg leading-tight">
            <button
              type="button"
              onClick={copyName}
              aria-label={`Copy font name "${font.name}"`}
              title="Copy font name"
              className="cursor-pointer whitespace-nowrap rounded outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              style={{ fontFamily: `"${font.name}", sans-serif` }}
            >
              {font.name}
            </button>
          </h1>
          {font.designer && (
            <p className="shrink-0 whitespace-nowrap text-xs">
              {font.designer}
            </p>
          )}
        </div>
      </div>
      <div className="hidden w-full flex-wrap items-center gap-2 lg:ml-auto lg:flex lg:w-auto lg:shrink-0 lg:flex-nowrap">
        <FontTraits font={font} selection={emptyFilter} />
        {font.license && (
          <Badge variant="outline" className="bg-background">
            {font.license}
          </Badge>
        )}
      </div>

      <div className="ml-auto hidden shrink-0 items-center gap-1 md:flex">
        <Separator aria-hidden orientation="vertical" className="mx-2 h-5" />
        <HeaderButtonGroup className="relative flex items-center gap-1">
          <HeaderButtonGroupItem index={0} className={RAIL_HEADER_CELL}>
            <HeaderLink
              href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
              aria-label={`View ${font.name} on Google Fonts`}
              icon={GoogleLogoIcon}
            />
          </HeaderButtonGroupItem>
          {font.repositoryUrl && (
            <HeaderButtonGroupItem index={1} className={RAIL_HEADER_CELL}>
              <HeaderLink
                href={font.repositoryUrl}
                aria-label={`View ${font.name}'s source repository`}
                icon={RepoIcon}
              />
            </HeaderButtonGroupItem>
          )}
          <Separator aria-hidden orientation="vertical" className="mx-2 h-5" />
          <HeaderButtonGroupItem
            index={font.repositoryUrl ? 2 : 1}
            className={RAIL_HEADER_CELL}
          >
            <ThemeToggle variant="header" />
          </HeaderButtonGroupItem>
          <HeaderButtonGroupItem
            index={font.repositoryUrl ? 3 : 2}
            className={RAIL_HEADER_CELL}
          >
            <AboutLink variant="header" />
          </HeaderButtonGroupItem>
          <HeaderButtonGroupItem
            index={font.repositoryUrl ? 4 : 3}
            className={RAIL_HEADER_CELL}
          >
            <GithubLink variant="header" />
          </HeaderButtonGroupItem>
          <HeaderButtonGroupItem
            index={font.repositoryUrl ? 5 : 4}
            className={RAIL_HEADER_CELL}
          >
            <FavoriteToggle fontId={font.id} variant="header" />
          </HeaderButtonGroupItem>
        </HeaderButtonGroup>
      </div>
    </>
  );
}

function HeaderLink({
  href,
  icon: Icon,
  "aria-label": ariaLabel,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  "aria-label": string;
}) {
  return (
    <div className={RAIL_HEADER_CELL}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={ariaLabel}
        className={RAIL_HEADER_BTN}
      >
        <Icon className="size-5 shrink-0" />
      </a>
    </div>
  );
}
