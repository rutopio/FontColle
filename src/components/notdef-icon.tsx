import { cn } from "@/lib/utils";

/**
 * The .notdef box, redrawn from the Adobe NotDef font this app already ships as
 * the preview fallback (public/fonts/adobe-notdef.woff2): the glyph's outline
 * was read out of its CFF table and mapped onto Phosphor's 256 viewBox, so the
 * icon and the boxes it stands for share a bounding box and proportions.
 *
 * Drawn as strokes rather than reusing the glyph's own filled path. The glyph
 * frame is 5% of the em, which at a 16px toolbar icon is a 0.7px hairline: the
 * filled path's diagonals all but vanish, and the active and inactive states
 * become impossible to tell apart. Stroke weight carries that distinction
 * instead, matching how Phosphor's regular/bold weights work.
 */
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
