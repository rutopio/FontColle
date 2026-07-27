import { SmileyIcon } from "@phosphor-icons/react";

// Traced once by scripts/gen-specimen-svgs.mjs, so the cards draw their sample
// without loading a webfont.

// A CSS mask over a currentColor background, NOT an <img>: `fill:currentColor`
// resolves only for inline SVG, so an <img src> falls back to black and the
// glyphs stay black in dark mode.
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
