// Thin wrapper around TanStack Start's default server entry so SSR-rendered HTML
// documents carry the same security headers as static assets do via
// public/_headers (which only applies to asset responses, not Worker output).
//
// The inner default export is `{ fetch }` (see
// @tanstack/react-start/dist/default-entry/esm/server.js). We delegate every
// arg to it and, for text/html responses, add the security headers. Cache-
// Control rules are intentionally NOT set here — those belong to static assets.
import serverEntry from "@tanstack/react-start/server-entry";

// Mirror the CSP / security headers from public/_headers. Kept as a single map
// so the two lists stay easy to compare.
const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://lh3.googleusercontent.com; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

export default {
  async fetch(
    ...args: Parameters<typeof serverEntry.fetch>
  ): Promise<Response> {
    const res = await serverEntry.fetch(...args);

    // Only decorate HTML documents; assets are handled by _headers. Response
    // headers can be immutable, so clone before mutating.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return res;

    const next = new Response(res.body, res);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      next.headers.set(key, value);
    }
    return next;
  },
};
