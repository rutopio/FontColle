import { HeartIcon } from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  RAIL_BAR_BTN,
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_BTN_ON,
  RAIL_HEADER_BTN,
} from "@/components/rail-button";
import { useFavorites } from "@/lib/fonts/favorites";
import { cn } from "@/lib/utils";

// Phosphor weight is a prop, not CSS, so the hover-bold twin is a second icon
// rather than a restyle. `red` is for where the heart itself carries the state.
function HeartLabel({
  active,
  red,
  bar,
  label,
}: {
  active: boolean;
  red?: boolean;
  bar?: boolean;
  label: string;
}) {
  return (
    <>
      <HeartIcon
        // Keyed on the favorited state so hearting remounts the icon and
        // replays the pop. Only `red` (detail) pops: there the heart IS the
        // state. On the list it is a view switch, where a celebration would
        // claim something happened to a font that did not.
        key={red && active ? "on" : "off"}
        className={cn(
          "size-5 group-hover/rail-btn:hidden",
          red && active && "animate-heart-pop text-red-500"
        )}
        weight={active ? "fill" : "regular"}
      />
      <HeartIcon
        className={cn(
          "hidden size-5 group-hover/rail-btn:block",
          red && active && "text-red-500"
        )}
        weight="duotone"
      />
      {/* max-w-full + truncate: in the header variant this sits in a
          fixed-width cell, and a caption wider than it would otherwise stretch
          the cell past its neighbours'. */}
      {!bar && (
        <span className="max-w-full truncate text-[10px] leading-none">
          {label}
        </span>
      )}
    </>
  );
}

// Without `fontId` a link toggling the favorites-only view; with one, a toggle
// that hearts THIS font. Favorites live in localStorage, the view in the URL.
export function FavoriteToggle({
  fontId,
  variant = "rail",
}: {
  fontId?: string;
  variant?: "rail" | "bar" | "header";
}) {
  const chrome =
    variant === "rail"
      ? RAIL_BTN
      : variant === "bar"
        ? RAIL_BAR_BTN
        : RAIL_HEADER_BTN;
  const bare = variant === "bar";
  const red = variant !== "rail";
  // The header's cell owns the hover tint (and the group the icon swap
  // watches), so this must not stack a second hover on top of it.
  const hover = variant === "header" ? undefined : RAIL_BTN_OFF;
  if (fontId)
    return (
      <FavoriteMark
        fontId={fontId}
        bare={bare}
        header={variant === "header"}
        hover={hover}
        chrome={chrome}
      />
    );
  return (
    <FavoriteViewLink
      bare={bare}
      header={variant === "header"}
      red={red}
      hover={hover}
      chrome={chrome}
    />
  );
}

function FavoriteMark({
  fontId,
  bare,
  header,
  hover,
  chrome,
}: {
  fontId: string;
  bare?: boolean;
  header?: boolean;
  hover?: string;
  chrome: string;
}) {
  const { favorites, toggle } = useFavorites();
  const on = favorites.includes(fontId);
  return (
    <nav
      aria-label="Favorite"
      // w-full in the header: the cell sizes the control, and without it this
      // wrapper shrink-wraps the label and the tile floats in the middle of the
      // cell rather than filling it the way a rail button does.
      className={header ? "w-full" : bare ? undefined : "flex flex-col gap-1"}
    >
      <button
        type="button"
        onClick={() => toggle(fontId)}
        aria-pressed={on}
        aria-label={on ? "Remove from favorites" : "Add to favorites"}
        // Never an ON background: the red filled heart carries the state.
        className={cn(chrome, hover)}
      >
        <HeartLabel active={on} bar={bare} label="Add" red />
      </button>
    </nav>
  );
}

function FavoriteViewLink({
  bare,
  header,
  red,
  hover,
  chrome,
}: {
  bare?: boolean;
  header?: boolean;
  red?: boolean;
  hover?: string;
  chrome: string;
}) {
  // Route-agnostic: this sits in the global AppSidebar, shown on both routes,
  // so it can't use a strict route hook.
  const fav = useRouterState({
    select: (s) => s.location.search.fav === "1",
  });
  return (
    <nav
      aria-label="Favorites"
      // See FavoriteMark: the header cell sizes the control.
      className={header ? "w-full" : bare ? undefined : "flex flex-col gap-1"}
    >
      <Link
        to="/"
        search={(prev) => ({ ...prev, fav: fav ? undefined : "1" })}
        // role="link" does not allow aria-pressed, so a screen reader would
        // drop the state; aria-current is the link equivalent.
        aria-current={fav ? "page" : undefined}
        aria-label={fav ? "Show all fonts" : "Show favorite fonts"}
        className={cn(
          chrome,
          red ? cn(fav && "text-red-500", hover) : fav ? RAIL_BTN_ON : hover
        )}
      >
        {/* No `red` here despite the red text above: that flag also fires the
            heart-pop, which belongs to hearting a font, not to switching which
            view you are looking at. The colour comes from the className, which
            the icons inherit. */}
        <HeartLabel active={fav} bar={bare} label="Favorite" />
      </Link>
    </nav>
  );
}
