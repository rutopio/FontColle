import { ArrowsOutLineVerticalIcon } from "@phosphor-icons/react";
import { EditableValue } from "@/components/ui/editable-value";
import { Slider } from "@/components/ui/slider";
import {
  LEADING_DEFAULT,
  LEADING_MAX,
  LEADING_MIN,
  LEADING_PRESETS,
  usePreview,
} from "@/lib/preview/context";

export function PreviewLeadingSection() {
  const { leading, setLeading } = usePreview();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-medium text-primary text-sm uppercase">
          <ArrowsOutLineVerticalIcon className="size-4" />
          Preview Leading
        </h2>
        <EditableValue
          value={leading}
          min={LEADING_MIN}
          max={LEADING_MAX}
          suffix="%"
          presets={LEADING_PRESETS}
          defaultValue={LEADING_DEFAULT}
          onChange={setLeading}
          ariaLabel="Preview leading"
        />
      </div>
      <Slider
        label="Preview leading"
        min={LEADING_MIN}
        max={LEADING_MAX}
        value={leading}
        onChange={(v) => setLeading(v as number)}
        showValue={false}
        tooltipSide="bottom"
        className="mb-0"
      />
    </div>
  );
}
