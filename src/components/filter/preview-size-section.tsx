import { TextAaIcon } from "@phosphor-icons/react";
import { EditableValue } from "@/components/ui/editable-value";
import { Slider } from "@/components/ui/slider";
import {
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  SIZE_PRESETS,
  usePreview,
} from "@/lib/preview/context";

export function PreviewSizeSection() {
  const { size, setSize } = usePreview();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
          <TextAaIcon className="size-4" />
          Preview Font Size
        </h2>
        <EditableValue
          value={size}
          min={SIZE_MIN}
          max={SIZE_MAX}
          suffix="px"
          presets={SIZE_PRESETS}
          defaultValue={SIZE_DEFAULT}
          onChange={setSize}
          ariaLabel="Preview font size"
        />
      </div>
      <Slider
        label="Preview font size"
        min={SIZE_MIN}
        max={SIZE_MAX}
        value={size}
        onChange={(v) => setSize(v as number)}
        showValue={false}
        tooltipSide="bottom"
        className="mb-0"
      />
    </div>
  );
}
