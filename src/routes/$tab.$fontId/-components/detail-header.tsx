import { ArrowLeftIcon, GoogleLogoIcon } from "@phosphor-icons/react";
import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import type * as React from "react";
import { useEffect, useState } from "react";
import { AboutLink } from "@/components/about-link";
import { FavoriteToggle } from "@/components/favorite-toggle";
import { FontTraits } from "@/components/font-traits";
import { RAIL_HEADER_BTN, RAIL_HEADER_CELL } from "@/components/rail-button";
import { repoHostIcon } from "@/components/repo-host-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { emptyFilter } from "@/lib/fonts/filter/state";
import type { FontRecord } from "@/lib/fonts/types";
import { backWithViewTransition } from "@/lib/view-transition";

export function DetailHeader({ font }: { font: FontRecord }) {
  const router = useRouter();
  // Deferred to avoid hydration mismatch (server can't read browser history).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const canGoBack = useCanGoBack() && mounted;

  const RepoIcon = repoHostIcon(font.repositoryUrl);

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
              className={RAIL_HEADER_BTN}
            >
              <ArrowLeftIcon className="size-5 shrink-0" />
            </button>
          ) : (
            <Link
              to="/"
              viewTransition
              aria-label="Back to all fonts"
              className={RAIL_HEADER_BTN}
            >
              <ArrowLeftIcon className="size-5 shrink-0" />
            </Link>
          )}
        </div>
        <div className="flex min-w-0 items-baseline gap-2">
          <h1
            className="truncate font-semibold text-lg leading-tight"
            style={{ fontFamily: `"${font.name}", sans-serif` }}
          >
            {font.name}
          </h1>
          {font.designer && (
            <p className="truncate text-muted-foreground text-xs">
              {font.designer}
            </p>
          )}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto md:shrink-0 md:flex-nowrap">
        {/* FontTraits fills its outline badges itself. */}
        <FontTraits font={font} selection={emptyFilter} />
        {font.license && (
          <Badge variant="outline" className="bg-background">
            {font.license}
          </Badge>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <HeaderLink
          href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
          aria-label={`View ${font.name} on Google Fonts`}
          icon={GoogleLogoIcon}
        />
        {font.repositoryUrl && (
          <HeaderLink
            href={font.repositoryUrl}
            aria-label={`View ${font.name}'s source repository`}
            icon={RepoIcon}
          />
        )}
        <div className={RAIL_HEADER_CELL}>
          <ThemeToggle variant="header" />
        </div>
        <div className={RAIL_HEADER_CELL}>
          <AboutLink variant="header" />
        </div>
        <div className={RAIL_HEADER_CELL}>
          <FavoriteToggle fontId={font.id} variant="header" />
        </div>
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
