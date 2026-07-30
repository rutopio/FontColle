import type { FontRecord } from "@/lib/fonts/types";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { Panel } from "./panel";

export function AboutPanel({ font }: { font: FontRecord }) {
  const html = sanitizeHtml(font.about);
  return (
    <Panel label="About">
      {html ? (
        <div
          className="prose-about text-sm leading-relaxed [&_a:hover]:decoration-foreground [&_a]:underline [&_a]:decoration-muted-foreground/50 [&_p]:my-3 first:[&_p]:mt-0"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: content is sanitized to an allowlist in sanitizeHtml.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="py-2 text-muted-foreground text-sm">
          No description available for this family.
        </p>
      )}
    </Panel>
  );
}
