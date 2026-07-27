// The source is trusted (Google's metadata endpoint), but this still strips to
// an allowlist before dangerouslySetInnerHTML, so a future source change can't
// inject scripts or handlers. Pure string work, so it runs under SSR too.

// Everything else is dropped. <a> keeps a sanitized href, nothing else does.
const ALLOWED = new Set([
  "p",
  "br",
  "a",
  "em",
  "strong",
  "i",
  "b",
  "u",
  "ul",
  "ol",
  "li",
  "h3",
  "h4",
  "blockquote",
]);

// Only http(s)/mailto hrefs survive; javascript: and data: are dropped.
function safeHref(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:|mailto:)/i.test(url)) return url;
  return null;
}

/**
 * A disallowed tag is removed but its text content stays. Attributes are
 * stripped except a validated href, which also gets rel/target.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(
    /<\/?([a-zA-Z0-9]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (_match, rawTag: string, attrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED.has(tag)) return "";
      const closing = _match.startsWith("</");
      if (closing) return `</${tag}>`;
      if (tag === "a") {
        const m = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
        const href = m ? safeHref(m[2] ?? m[3] ?? m[4] ?? "") : null;
        return href
          ? `<a href="${href}" target="_blank" rel="noreferrer">`
          : "<a>";
      }
      return `<${tag}>`;
    }
  );
}
