import { Badge } from "@/components/ui/badge";
import { previewStyle } from "@/lib/fonts/preview-style";
import type { FontInstance } from "@/lib/fonts/types";
import { EditableSpecimen } from "./editable-specimen";

// One named-instance row: its label + coords on the first line, and a large
// editable preview of the shared specimen on the second. Editing the preview
// updates the shared text, so every row and the type tester change together.
//
// The sidebar's size and OpenType feature controls apply to every row, so the
// whole list can be read at one size with the same features on. The axis
// sliders deliberately do NOT: each row is pinned to its own instance's coords,
// which is the entire point of this view.
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
  // undefined when no feature deviates from its W3C default, which leaves
  // font-feature-settings unset rather than pinning it to an empty value.
  featureSettings: string | undefined;
  // Axis tags that differ somewhere in the family. Only these get a badge: a
  // tag every instance pins to the same value says nothing about this row.
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
    // Mirrors the list's FontRow: a full-width row, its own bottom border, the
    // name line above a large single-line preview. No hover/focus tint here
    // though, the row isn't a link, its preview is the editable target.
    <div className="flex flex-col justify-center gap-3 overflow-hidden border-b py-4">
      {/* items-center, not baseline: the coord badges are fixed-height pills,
          so they centre on the name the way FontRow's trait badges do. */}
      <div className="flex min-w-0 items-center gap-2 px-2">
        <h3 className="shrink-0 text-sm">{inst.name}</h3>
        {/* One badge per axis rather than a single run-on string, so each
            tag/value pair reads as its own chip. text-[10px] matches the list
            row's FontTraits badges; font-mono keeps the values aligned. Axes
            pinned to one value family-wide are dropped: only what distinguishes
            this instance from its siblings earns a badge. The preview itself
            still renders at the full coords. */}
        {Object.entries(inst.coords)
          .filter(([tag]) => varyingAxisTags.has(tag))
          .map(([tag, value]) => (
            <Badge
              key={tag}
              variant="outline"
              className="shrink-0 font-mono text-[10px]"
            >
              {tag} {value}
            </Badge>
          ))}
      </div>
      <EditableSpecimen
        text={specimen}
        style={style}
        onEditText={onEditText}
        ariaLabel={`preview text for ${inst.name}`}
        className="w-full cursor-text border-transparent border-b bg-transparent px-2 text-start leading-loose outline-none focus:border-foreground"
      />
    </div>
  );
}
