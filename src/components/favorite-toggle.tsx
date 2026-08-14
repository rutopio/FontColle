import { HeartIcon } from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  RAIL_BAR_BTN,
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_BTN_ON,
  RAIL_HEADER_BTN,
} from "@/components/rail-button";
import { useFavoriteAdded, useFavorites } from "@/lib/fonts/favorites";
import { cn } from "@/lib/utils";

// Long enough to notice, short enough not to read as a selected state.
const FLASH_MS = 900;

function HeartLabel({
  active,
  red,
  flash,
  flashKey,
  iconOnly,
  label,
}: {
  active: boolean;
  red?: boolean;
  flash?: boolean;
  flashKey?: number;
  iconOnly?: boolean;
  label: string;
}) {
  const filled = active || flash;
  return (
    <>
      <HeartIcon
        // Keyed on the tick so the pop replays on every add, not just the first.
        key={flash ? `flash-${flashKey}` : red && active ? "on" : "off"}
        className={cn(
          "size-5 group-hover/rail-btn:hidden",
          ((red && active) || flash) && "animate-heart-pop text-red-500"
        )}
        weight={filled ? "fill" : "regular"}
      />
      <HeartIcon
        className={cn(
          "hidden size-5 group-hover/rail-btn:block",
          ((red && active) || flash) && "text-red-500"
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
  // Flash on add to point at where the font landed — pointless while the
  // favorites view is already open. Keyed on the tick alone so opening that
  // view mid-flash can't cancel the timer and strand the heart lit.
  const added = useFavoriteAdded();
  const [flash, setFlash] = useState(false);
  const seenTick = useRef(added);
  const favRef = useRef(fav);
  favRef.current = fav;
  useEffect(() => {
    if (added === seenTick.current) return;
    seenTick.current = added;
    if (favRef.current) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(t);
  }, [added]);

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
          red ? cn(fav && "text-red-500", hover) : fav ? RAIL_BTN_ON : hover,
          flash && !fav && "text-red-500"
        )}
      >
        <HeartLabel
          active={fav}
          flash={flash}
          flashKey={added}
          iconOnly={bare || header}
          label="Favorite"
        />
      </Link>
    </nav>
  );
}
