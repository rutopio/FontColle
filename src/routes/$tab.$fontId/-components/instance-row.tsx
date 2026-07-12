import { previewStyle } from "@/lib/fonts/preview-style";
import type { FontInstance } from "@/lib/fonts/types";
import { EditableSpecimen } from "./editable-specimen";

// One named-instance row: its label + coords on the first line, and a large
// editable preview of the shared specimen on the second. Editing the preview
// updates the shared text, so every row and the type tester change together.
export function InstanceRow({
  inst,
  specimen,
  fontName,
  fontLoaded,
  onEditText,
}: {
  inst: FontInstance;
  specimen: string;
  fontName: string;
  fontLoaded: boolean;
  onEditText: (value: string) => void;
}) {
  const style = previewStyle({
    name: fontName,
    loaded: fontLoaded,
    coords: inst.coords,
    italic: inst.italic,
  });

  return (
    <div className="flex flex-col gap-4 overflow-hidden py-3">
      <span className="flex items-baseline gap-2">
        <span className="text-sm">{inst.name}</span>
        <span className="truncate font-mono text-muted-foreground text-xs">
          {Object.entries(inst.coords)
            .map(([t, v]) => `${t} ${v}`)
            .join("  ")}
        </span>
      </span>
      <EditableSpecimen
        text={specimen}
        style={style}
        onEditText={onEditText}
        ariaLabel={`preview text for ${inst.name}`}
        buttonClassName="w-full cursor-text truncate border-transparent border-b text-start text-3xl leading-tight"
        fieldClassName="w-full border-transparent border-b bg-transparent text-start text-3xl leading-tight outline-none focus:border-foreground"
      />
    </div>
  );
}
