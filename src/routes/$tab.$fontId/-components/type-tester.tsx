import type { CSSProperties } from "react";
import { EditableSpecimen } from "./editable-specimen";

// The main preview line, click-to-edit. Wraps EditableSpecimen with the tester's
// own multiline (auto-growing textarea) styling.
export function TypeTester({
  specimen,
  style,
  onEditText,
}: {
  specimen: string;
  style: CSSProperties;
  onEditText: (value: string) => void;
}) {
  return (
    <EditableSpecimen
      text={specimen}
      style={style}
      onEditText={onEditText}
      ariaLabel="preview text"
      multiline
      buttonClassName="w-full cursor-text break-words text-start leading-tight"
      fieldClassName="field-sizing-content w-full resize-none break-words bg-transparent text-start leading-tight outline-none"
    />
  );
}
