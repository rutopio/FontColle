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

function HeartLabel({
  active,
  red,
  iconOnly,
  label,
}: {
  active: boolean;
  red?: boolean;
  iconOnly?: boolean;
  label: string;
}) {
  return (
    <>
      <HeartIcon
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
      {!iconOnly && (
        <span className="max-w-full truncate text-3xs leading-none">
          {label}
        </span>
      )}
    </>
  );
}

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
      className={header || bare ? undefined : "flex flex-col gap-1"}
    >
      <button
        type="button"
        onClick={() => toggle(fontId)}
        aria-pressed={on}
        aria-label={on ? "Remove from favorites" : "Add to favorites"}
        className={cn(chrome, hover)}
      >
        <HeartLabel active={on} iconOnly={bare || header} label="Add" red />
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
  const fav = useRouterState({
    select: (s) => s.location.search.fav === "1",
  });
  return (
    <nav
      aria-label="Favorites"
      className={header || bare ? undefined : "flex flex-col gap-1"}
    >
      <Link
        to="/"
        search={(prev) => ({ ...prev, fav: fav ? undefined : "1" })}
        aria-current={fav ? "page" : undefined}
        aria-label={fav ? "Show all fonts" : "Show favorite fonts"}
        className={cn(
          chrome,
          red ? cn(fav && "text-red-500", hover) : fav ? RAIL_BTN_ON : hover
        )}
      >
        <HeartLabel active={fav} iconOnly={bare || header} label="Favorite" />
      </Link>
    </nav>
  );
}
