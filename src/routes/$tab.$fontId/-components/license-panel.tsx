import { LICENSE_BOILERPLATE } from "@/lib/fonts/license-text";
import type { FontRecord } from "@/lib/fonts/types";
import { CopyButton } from "./copy-button";

function licenseText(font: FontRecord) {
  const boilerplate = font.license
    ? LICENSE_BOILERPLATE[font.license]
    : undefined;
  return [font.licenseHeader, boilerplate].filter(Boolean).join("\n\n").trim();
}

// Outside ScrollArea so the scroll-fade mask doesn't dissolve it.
export function LicenseHeading({ font }: { font: FontRecord }) {
  const text = licenseText(font);
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-semibold text-2xl">
        {font.license ? `License · ${font.license}` : "License"}
      </h2>
      {text ? (
        <div className="-my-1 flex items-center">
          <CopyButton text={text} label="Copy license text" />
        </div>
      ) : null}
    </div>
  );
}

export function LicensePanel({ font }: { font: FontRecord }) {
  const text = licenseText(font);

  return text ? (
    <pre className="overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
      {text}
    </pre>
  ) : (
    <p className="py-2 text-sm">No license text available for this family.</p>
  );
}
