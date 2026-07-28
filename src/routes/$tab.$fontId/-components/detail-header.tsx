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
import { Separator } from "@/components/ui/separator";
import { emptyFilter } from "@/lib/fonts/filter/state";
import type { FontRecord } from "@/lib/fonts/types";
import { backWithViewTransition } from "@/lib/view-transition";

// The detail page's header. It lives here rather than inside Detail so the
// layout can render it in its own header slot, spanning the full shell width.
// Self-contained: it reads the history state it needs rather than taking it as
// props, so the page only has to pass the font.
export function DetailHeader({ font }: { font: FontRecord }) {
  const router = useRouter();
  // useCanGoBack() reads browser history, which the server can't see, so
  // swapping <a> -> <button> on its value would be a hydration mismatch. Gate
  // on a mount flag: first client render matches the server, then upgrade.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const canGoBack = useCanGoBack() && mounted;

  const RepoIcon = repoHostIcon(font.repositoryUrl);

  return (
    <>
      <div className="flex w-full min-w-0 items-center gap-1 md:w-auto">
        {/* Back opens the header as the band of links closes it: the same
              tile, at the other end of the row. Below md it falls back to a
              plain icon button, where the header wraps and there is no fixed
              height to work against.

              It returns to the list. If we arrived from it, go back in
              history so its filter URL + scroll position are restored; on a
              deep/shared link (no history to go back to) fall back to the
              default, unfiltered list. */}
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
              <BackFace />
            </button>
          ) : (
            <Link
              to="/"
              viewTransition
              aria-label="Back to all fonts"
              className={RAIL_HEADER_BTN}
            >
              <BackFace />
            </Link>
          )}
        </div>
        {/* The same rule the list page draws before its app controls: Back
            leaves the page, the title names it, so the two are different kinds
            of thing and the line says so. Desktop only, where Back is a tile
            rather than a wrapped icon button. */}
        <Separator
          orientation="vertical"
          // As tall as the tile it divides, not the header's full height.
          className="hidden data-vertical:h-[3.125rem] md:block"
        />
        <div className="flex min-w-0 flex-col gap-1 pl-3">
          <h1
            className="truncate font-semibold text-lg leading-tight"
            style={{ fontFamily: `"${font.name}", sans-serif` }}
          >
            {font.name}
          </h1>
          {font.designer && <p className="truncate text-xs">{font.designer}</p>}
        </div>
      </div>
      {/* Trait badges, same order as the list card/row (class, Variable/
            Static, color, feature count), plus the family's license.

            md:ml-auto puts all the row's slack to the left of this block, so
            it and the run of cells after it stay together at the end of the
            row. (The header carries no justify-between: with this many blocks
            it would spread them and strand the badges in the middle.) */}
      <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto md:shrink-0 md:flex-nowrap">
        <FontTraits font={font} selection={emptyFilter} />
        {font.license && <Badge variant="outline">{font.license}</Badge>}
      </div>

      {/* The outbound links and Add, as one run of header tiles rather than
            outline buttons: they match Back at the other corner and the rail's
            own buttons below, so the header closes with a band of controls in
            the app's one button style instead of a row of pills.

            gap-1, the same the rail puts between its own buttons, rather than
            the header row's gap-3 — which would space these further apart than
            the rail spaces the ones they match.

            Desktop only, as the buttons were — on mobile these don't fit
            beside the title and are reached through LinksDrawer's FAB. */}
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        {/* Opens the run, as the rule after Back closes the title block: the
            badges describe the font, these act on it. */}
        <Separator
          orientation="vertical"
          className="data-vertical:h-[3.125rem]"
        />
        <HeaderLink
          href={`https://fonts.google.com/specimen/${font.name.replace(/\s+/g, "+")}`}
          label="Google"
          aria-label={`View ${font.name} on Google Fonts`}
          icon={GoogleLogoIcon}
        />
        {font.repositoryUrl && (
          <HeaderLink
            href={font.repositoryUrl}
            label="Repo"
            aria-label={`View ${font.name}'s source repository`}
            icon={RepoIcon}
          />
        )}
        {/* Theme and About sit between this font's links and Add, in the same
              order the list page's header ends: the app's own controls, then
              the page's. */}
        <div className={RAIL_HEADER_CELL}>
          <ThemeToggle variant="header" />
        </div>
        <div className={RAIL_HEADER_CELL}>
          <AboutLink variant="header" />
        </div>
        {/* Add closes the band, where the list page's Favorite closes its
              own header — same control, same place either side of a
              navigation, only the meaning differs: hearting this font rather
              than switching to the hearted view. */}
        <div className={RAIL_HEADER_CELL}>
          <FavoriteToggle fontId={font.id} variant="header" />
        </div>
      </div>
    </>
  );
}

function BackFace() {
  return (
    <>
      <ArrowLeftIcon className="size-5 shrink-0" />
      <span className="max-w-full truncate text-[10px] leading-none">Back</span>
    </>
  );
}

// A plain <a>, not the Button primitive: nothing here wants its variants or
// padding, and the anchor carries its own label.
function HeaderLink({
  href,
  label,
  icon: Icon,
  "aria-label": ariaLabel,
}: {
  href: string;
  // Kept short: the cell is 72px wide, and the full name is in aria-label.
  label: string;
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
        <span className="max-w-full truncate text-[10px] leading-none">
          {label}
        </span>
      </a>
    </div>
  );
}
