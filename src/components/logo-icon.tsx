import { cn } from "@/lib/utils";

// The FontColle mark: a shop-front arch with shelf lines. currentColor for
// stroke so callers set the color via text-*; size via className (defaults to
// size-6). Reused wherever the brand icon is needed.
export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 21H21V12C21 9.61305 20.0518 7.32387 18.364 5.63604C16.6761 3.94821 14.3869 3 12 3C9.61305 3 7.32387 3.94821 5.63604 5.63604C3.94821 7.32387 3 9.61305 3 12V21Z" />
      <path d="M3 17L21 17" />
      <path d="M9 17V13H21" />
      <path d="M13 13V9H20" />
    </svg>
  );
}
