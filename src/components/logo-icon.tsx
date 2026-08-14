import { cn } from "@/lib/utils";

export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-6 text-primary", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5.25" fill="currentColor" />
      {/* The fridge is drawn on a 24px grid; inset it so the rounded plate
          keeps a margin, the way the previous mark did. */}
      <g
        transform="translate(4 4) scale(0.667)"
        fill="none"
        stroke="var(--color-primary-foreground)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 10V2.6C5 2.26863 5.26863 2 5.6 2H18.4C18.7314 2 19 2.26863 19 2.6V10M5 10V21.4C5 21.7314 5.26863 22 5.6 22H18.4C18.7314 22 19 21.7314 19 21.4V10M5 10H19" />
        <path d="M10 6L9 6" />
        <path d="M10 14L9 14" />
      </g>
    </svg>
  );
}
