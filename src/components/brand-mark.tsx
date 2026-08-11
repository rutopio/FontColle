import { Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/logo-icon";
import { SITE_NAME, SITE_NAME_PRONUNCIATION } from "@/lib/site";

export function BrandMark() {
  return (
    <Link
      to="/"
      aria-label={`${SITE_NAME} home`}
      title={`${SITE_NAME}, pronounced ${SITE_NAME_PRONUNCIATION}`}
      className="mb-8 flex flex-wrap items-center gap-2 text-primary"
    >
      <LogoIcon className="size-10" />
      <span className="font-mono text-2xl tracking-tight">{SITE_NAME}</span>
    </Link>
  );
}
