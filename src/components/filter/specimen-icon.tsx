import { SmileyIcon } from "@phosphor-icons/react";

// Static "Aa" specimens for the Category / Weight / Width filter cards. The
// outlines were traced from the representative faces once (see
// scripts/gen-specimen-svgs.mjs) into public/specimens/*.svg, so the cards no
// longer load a webfont to draw their sample. Each SVG uses `fill:currentColor`,
// so it follows the card's text colour (including hover / selected states).

// `img` keeps the CSP simple and lets the browser cache each specimen; the SVGs
// are tiny (~1.5 KB) and there are only 23 of them.
function SpecimenImg({ src, className }: { src: string; className?: string }) {
  // Decorative: the visible label below the specimen already names the value.
  return (
    <img src={src} alt="" aria-hidden className={className} draggable={false} />
  );
}

// The shared box: a fixed-height "Aa" slot matching the old text-2xl sample.
const boxClass = "h-6 w-full text-foreground [&>img]:mx-auto [&>img]:h-full";

export function CategorySpecimen({ category }: { category: string }) {
  // Emoji has no meaningful "Aa" specimen, so it shows an icon instead.
  if (category === "Emoji") {
    return (
      <span className={boxClass}>
        <SmileyIcon className="mx-auto size-6" aria-hidden />
      </span>
    );
  }
  return (
    <span className={boxClass}>
      <SpecimenImg src={`/specimens/category-${category.toLowerCase()}.svg`} />
    </span>
  );
}

export function WeightSpecimen({ value }: { value: string }) {
  return (
    <span className={boxClass}>
      <SpecimenImg src={`/specimens/weight-${value}.svg`} />
    </span>
  );
}

export function WidthSpecimen({ value }: { value: string }) {
  return (
    <span className={boxClass}>
      <SpecimenImg src={`/specimens/width-${value}.svg`} />
    </span>
  );
}
