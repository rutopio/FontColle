import { LICENSE_BOILERPLATE } from "@/lib/fonts/license-text";
import type { FontRecord } from "@/lib/fonts/types";
import { CopyButton } from "./copy-button";
import { Panel } from "./panel";

// The License view: the family's full license text, mirroring Google Fonts'
// /specimen/<Family>/license page. We assemble it from the per-family OFL
// copyright header (licenseHeader) plus the shared boilerplate for that license
// (LICENSE_BOILERPLATE), Apache/UFL have no per-family header. Plain text, so
// it renders verbatim in a monospace, scrollable block.
export function LicensePanel({ font }: { font: FontRecord }) {
  const boilerplate = font.license
    ? LICENSE_BOILERPLATE[font.license]
    : undefined;
  const text = [font.licenseHeader, boilerplate]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return (
    <Panel
      label={font.license ? `License · ${font.license}` : "License"}
      action={
        text ? <CopyButton text={text} label="Copy license text" /> : undefined
      }
    >
      {text ? (
        <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
          {text}
        </pre>
      ) : (
        <p className="py-2 text-sm">
          No license text available for this family.
        </p>
      )}
    </Panel>
  );
}
