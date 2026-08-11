// CSS mask + currentColor; <img> can't inherit fill.
function SpecimenImg({ src, className }: { src: string; className?: string }) {
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
