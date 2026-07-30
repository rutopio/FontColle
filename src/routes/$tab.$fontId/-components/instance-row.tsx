import { Badge } from "@/components/ui/badge";
import { previewStyle } from "@/lib/fonts/preview-style";
import type { FontInstance } from "@/lib/fonts/types";
import { EditableSpecimen } from "./editable-specimen";

export function InstanceRow({
  inst,
  specimen,
  fontName,
  fontLoaded,
  size,
  featureSettings,
  varyingAxisTags,
  onEditText,
}: {
  inst: FontInstance;
  specimen: string;
  fontName: string;
  fontLoaded: boolean;
  size: number;
  featureSettings: string | undefined;
  varyingAxisTags: Set<string>;
  onEditText: (value: string) => void;
}) {
  const style = {
    ...previewStyle({
      name: fontName,
      loaded: fontLoaded,
      coords: inst.coords,
      italic: inst.italic,
    }),
    fontSize: `${size}px`,
    fontFeatureSettings: featureSettings,
  };

  return (
    <div className="flex flex-col justify-center gap-3 overflow-hidden border-b py-4">
      <div className="flex min-w-0 items-center gap-2 px-2">
        <h3 className="shrink-0 text-sm">{inst.name}</h3>
        {Object.entries(inst.coords)
          .filter(([tag]) => varyingAxisTags.has(tag))
          .map(([tag, value]) => (
            <Badge
              key={tag}
              variant="outline"
              className="shrink-0 font-mono text-3xs"
            >
              {tag} {value}
            </Badge>
          ))}
      </div>
      {fontLoaded ? (
        <EditableSpecimen
          text={specimen}
          style={style}
          onEditText={onEditText}
          ariaLabel={`preview text for ${inst.name}`}
          className="w-full cursor-text border-transparent border-b bg-transparent px-2 text-start leading-loose outline-none focus:border-foreground"
        />
      ) : (
        <div
          className="mx-2 w-2/3 animate-pulse rounded bg-muted"
          style={{ height: `${size * 2}px` }}
          aria-hidden
        />
      )}
    </div>
  );
}
