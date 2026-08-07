import { cn } from "@/lib/utils";

const BOX = { x: 41.6, y: 20, w: 172.8, h: 216 };

const DIAGONALS = [
  `M${BOX.x} ${BOX.y}L${BOX.x + BOX.w} ${BOX.y + BOX.h}`,
  `M${BOX.x + BOX.w} ${BOX.y}L${BOX.x} ${BOX.y + BOX.h}`,
];

export function NotdefIcon({
  className,
  active = false,
}: {
  className?: string;
  active?: boolean;
}) {
  return (
    <svg
      className={cn("size-4", className)}
      viewBox="0 0 256 256"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 26 : 14}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} />
      {DIAGONALS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
