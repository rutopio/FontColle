import { SmileyIcon } from "@phosphor-icons/react";

// Static "Aa" specimens for the Category / Weight / Width filter cards. The
// outlines were traced from the representative faces once (see
// scripts/gen-specimen-svgs.mjs) into public/specimens/*.svg, so the cards no
// longer load a webfont to draw their sample.

// The SVGs carry `fill:currentColor`, but that only resolves for inline SVG —
// an `<img src>` renders in its own context and falls back to black, so dark
// theme showed black glyphs. Draw the SVG as a CSS mask over a `currentColor`
// background instead: the shape comes from the SVG, the colour from
// `text-foreground`, so it inverts with the theme (and follows hover/selected).
function SpecimenImg({ src, className }: { src: string; className?: string }) {
  // Decorative: the visible label below the specimen already names the value.
  return (
    <span
      aria-hidden
      className={`block h-full w-full ${className ?? ""}`}
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        backgroundColor: "currentColor",
      }}
    />
  );
}

// The shared box: a fixed-height "Aa" slot matching the old text-2xl sample.
const boxClass = "h-6 w-full text-foreground";

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
