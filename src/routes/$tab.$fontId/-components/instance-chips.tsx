import { previewStyle } from "@/lib/fonts/preview-style";
import type { FontInstance } from "@/lib/fonts/types";

// Named-instance chips above the type tester. Clicking one loads its axes into
// the preview. A chip is active while the preview still matches it, same
// italic state and every axis it sets unchanged, so nudging any of those axes
// deselects it on its own.
export function InstanceChips({
  instances,
  fontName,
  fontLoaded,
  axisState,
  italic,
  onLoadInstance,
}: {
  instances: FontInstance[];
  fontName: string;
  fontLoaded: boolean;
  axisState: Record<string, number>;
  italic: boolean;
  onLoadInstance: (coords: Record<string, number>, isItalic?: boolean) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {instances.map((inst) => {
        const active =
          italic === inst.italic &&
          Object.entries(inst.coords).every(([t, v]) => axisState[t] === v);
        return (
          <button
            key={`chip:${inst.italic ? "i" : "u"}:${inst.name}`}
            type="button"
            onClick={() => onLoadInstance(inst.coords, inst.italic)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-[color,background-color,border-color,transform] active:scale-[0.97] ${
              active
                ? "border-primary bg-muted text-foreground"
                : "hover:border-foreground"
            }`}
            style={previewStyle({
              name: fontName,
              loaded: fontLoaded,
              coords: inst.coords,
              italic: inst.italic,
            })}
          >
            {inst.name}
          </button>
        );
      })}
    </div>
  );
}
