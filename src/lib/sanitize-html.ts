// Minimal, dependency-free HTML sanitizer for the Google Fonts "about" prose and
// designer bios. These come from a trusted source (Google's metadata endpoint),
// but we still strip to a small allowlist before dangerouslySetInnerHTML so a
// future source change can't inject scripts/handlers. Isomorphic: pure string
// work, so it runs the same under SSR and in the browser (no DOM needed).

// Block/inline tags we keep. Everything else (script, style, img, iframe, on*
// handlers) is dropped. <a> keeps a sanitized href; all other attributes go.
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
 * Return the input with only allowlisted tags kept. Disallowed tags are removed
 * (their text content stays); attributes are stripped except a validated href on
 * <a>, which also gets rel/target for safe external navigation.
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
