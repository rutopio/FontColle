import { Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/logo-icon";
import { SITE_NAME } from "@/lib/site";

export function BrandMark() {
  return (
    <Link
      to="/"
      aria-label={`${SITE_NAME} home`}
      className="mb-8 flex flex-wrap items-center gap-2 text-primary"
    >
      <LogoIcon className="size-10" />
      <span className="font-mono text-2xl tracking-tight">{SITE_NAME}</span>
    </Link>
  );
}
