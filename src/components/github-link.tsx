import { GithubLogoIcon } from "@phosphor-icons/react";
import {
  RAIL_BAR_BTN,
  RAIL_BTN,
  RAIL_BTN_OFF,
  RAIL_HEADER_BTN,
} from "@/components/rail-button";
import { REPO_URL, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

export function GithubLink({
  variant = "rail",
}: {
  variant?: "rail" | "bar" | "header";
}) {
  const bar = variant === "bar";
  const header = variant === "header";
  const chrome = bar ? RAIL_BAR_BTN : header ? RAIL_HEADER_BTN : RAIL_BTN;
  const hover = header ? undefined : RAIL_BTN_OFF;

  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={`View ${SITE_NAME} on GitHub`}
      className={cn(chrome, hover)}
    >
      <GithubLogoIcon className="size-5 group-hover/rail-btn:hidden" />
      <GithubLogoIcon
        className="hidden size-5 group-hover/rail-btn:block"
        weight="duotone"
      />
      {!(bar || header) && (
        <span className="max-w-full truncate text-3xs leading-none">
          GitHub
        </span>
      )}
    </a>
  );
}
