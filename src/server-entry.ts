// Wraps TanStack Start's default server entry so SSR'd HTML carries the same
// security headers static assets get from public/_headers, which applies only
// to asset responses, not Worker output. Cache-Control rules are deliberately
// NOT set here: those belong to the static assets.
import serverEntry from "@tanstack/react-start/server-entry";
import { mcpEndpoint } from "@/mcp/server";

// Advertised on every HTML document so agents can discover the site's
// machine-readable resources (RFC 8288). Every target is a real served asset.
const LINK_HEADER = [
  '</llms.txt>; rel="describedby"; type="text/markdown"',
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
].join(", ");

// Crawlers that walk filter permutations of `/`. The filter params are an
// effectively infinite URL space, and each one costs a full React SSR for a
// page whose body is only a loading skeleton, the real list being fetched
// client-side. One crawler was 1964 of 2000 requests in a production hour, and
// every exceededCpu event in the window was one of them. Matched on UA only, so
// a human on a filtered URL still gets the normal SSR.
const CRAWLER_UA =
  /bot|crawler|spider|GPTBot|ClaudeBot|Bytespider|facebookexternalhit|slurp/i;

// Minimal HTML for a crawler hitting a filtered `/`. Deliberately NOT the app
// shell: it is never hydrated, and the stylesheet/module filenames are build
// hashes the Worker can't resolve anyway. The canonical points at the bare `/`,
// the same one the real route emits, so the crawler consolidates these URLs
// there instead of walking more permutations.
const FILTERED_CRAWLER_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>FontColle</title><link rel="canonical" href="https://fontcolle.com/"><meta name="robots" content="noindex,follow"></head><body><p>Filtered views of the FontColle catalog are rendered in the browser. <a href="/">Browse the full catalog</a>.</p></body></html>`;

// The document is rebuilt on every deploy and the daily harvest fires a deploy
// hook, so a stale entry can only be minutes old: the cache is per-colo and
// empty again after each deploy's cold start.
const HOME_CACHE_SECONDS = 600;

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
    const request = args[0] as Request;
    const assets = (args[1] as { ASSETS?: { fetch: typeof fetch } })?.ASSETS;

    // Checked first: MCP clients send their own Accept headers and must never
    // fall through to the HTML SSR renderer.
    const mcp = await mcpEndpoint(request, assets);
    if (mcp) return mcp;

    // A request that prefers markdown and does not accept HTML gets the
    // machine-readable description: the HTML SSR renderer 500s on those.
    // Browsers send `text/html` in Accept, so they never match.
    const accept = request.headers?.get?.("accept") ?? "";
    if (accept.includes("text/markdown") && !accept.includes("text/html")) {
      const url = new URL(request.url);
      const llms = assets
        ? await assets.fetch(new Request(new URL("/llms.txt", url)))
        : undefined;
      const body = llms?.ok
        ? await llms.text()
        : "# FontColle\n\nSee /llms.txt";
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Link: LINK_HEADER,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // Skip the React SSR entirely (see CRAWLER_UA). Only `/` with a query
    // string matches: the bare `/` still SSRs its real first-page slice, and
    // every detail page is untouched.
    const url = new URL(request.url);
    if (
      url.pathname === "/" &&
      url.search !== "" &&
      CRAWLER_UA.test(request.headers?.get?.("user-agent") ?? "")
    ) {
      return new Response(FILTERED_CRAWLER_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          // Let the edge absorb repeat hits so a crawler walking thousands of
          // permutations stops reaching the Worker at all.
          "Cache-Control": "public, max-age=3600",
          "X-Robots-Tag": "noindex, follow",
          ...SECURITY_HEADERS,
        },
      });
    }

    // The bare `/` SSRs the same bytes for every visitor: the first-page slice
    // is a build-time asset, favorites hydrate to [] client-side, and preview
    // text starts empty. Verified against production — two responses differ
    // only in TanStack Router's advisory `u:<ms>` timestamp. So render once per
    // colo and serve the rest from the edge, where a hit costs no React render
    // at all.
    //
    // ONLY the bare `/` qualifies: any query string makes the document
    // visitor-specific, and detail pages already cost far less per request.
    const isCacheableHome =
      request.method === "GET" && url.pathname === "/" && url.search === "";
    // `caches.default` is the Workers runtime's per-colo cache. It is absent
    // from the DOM CacheStorage type the app compiles against, hence the cast.
    const cache = (caches as unknown as { default: Cache }).default;
    if (isCacheableHome) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }

    const res = await serverEntry.fetch(...args);

    // Only decorate HTML documents; assets are handled by _headers. Response
    // headers can be immutable, so clone before mutating.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return res;

    const next = new Response(res.body, res);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      next.headers.set(key, value);
    }
    next.headers.set("Link", LINK_HEADER);

    // Store a clone and return the original: cache.put() consumes the body it
    // is given, and a streamed SSR body can only be read once. waitUntil keeps
    // the write off the response's critical path. Only 200s are cached, so an
    // SSR error is never pinned at the edge.
    if (isCacheableHome && next.status === 200) {
      next.headers.set(
        "Cache-Control",
        `public, max-age=${HOME_CACHE_SECONDS}`
      );
      // The Workers module format calls fetch(request, env, ctx); the handler's
      // declared tuple stops at 2, so read the ExecutionContext off the rest.
      const ctx = (args as unknown[])[2] as ExecutionContext | undefined;
      const write = cache.put(request, next.clone());
      if (ctx?.waitUntil) ctx.waitUntil(write);
    }
    return next;
  },
};
