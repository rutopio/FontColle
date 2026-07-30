import { LICENSE_BOILERPLATE } from "@/lib/fonts/license-text";
import type { FontRecord } from "@/lib/fonts/types";
import { CopyButton } from "./copy-button";
import { Panel } from "./panel";

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
