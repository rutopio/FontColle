import { Link } from "@tanstack/react-router";
import { LogoIcon } from "@/components/logo-icon";

export function BrandMark() {
  return (
    <Link
      to="/"
      aria-label="FontColle home"
      className="mb-8 flex flex-wrap items-center gap-2 text-primary"
    >
      <LogoIcon className="size-10" />
      <span className="font-mono text-2xl tracking-tight">FontColle</span>
    </Link>
  );
}
