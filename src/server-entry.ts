import serverEntry from "@tanstack/react-start/server-entry";
import { mcpEndpoint } from "@/mcp/server";

const LINK_HEADER = [
  '</llms.txt>; rel="describedby"; type="text/markdown"',
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</openapi.json>; rel="service-desc"; type="application/openapi+json"',
].join(", ");

const CRAWLER_UA =
  /bot|crawler|spider|GPTBot|ClaudeBot|Bytespider|facebookexternalhit|slurp/i;

const FILTERED_CRAWLER_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>FontFridge</title><link rel="canonical" href="https://font.chingru.com/"><meta name="robots" content="noindex,follow"></head><body><p>Filtered views of the FontFridge catalog are rendered in the browser. <a href="/">Browse the full catalog</a>.</p></body></html>`;

const HOME_CACHE_SECONDS = 600;

// Cache key includes the build ID so a deploy invalidates stale SSR entries.
declare const __BUILD_ID__: string;

function cacheKey(request: Request): Request {
  const url = new URL(request.url);
  url.searchParams.set("__b", __BUILD_ID__);
  return new Request(url, request);
}

const DETAIL_CACHE_SECONDS = 86400;
const DETAIL_TAB_SLUGS = new Set([
  "instances",
  "paragraph",
  "glyphs",
  "detail",
  "designer",
  "use",
  "license",
]);

function isCacheableDetail(url: URL): boolean {
  if (url.search !== "") return false;
  const parts = url.pathname.split("/");
  return (
    parts.length === 3 && DETAIL_TAB_SLUGS.has(parts[1]) && parts[2] !== ""
  );
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://lh3.googleusercontent.com; connect-src 'self' https://fonts.googleapis.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};

export default {
  async fetch(
    ...args: Parameters<typeof serverEntry.fetch>
  ): Promise<Response> {
    const request = args[0] as Request;
    const assets = (args[1] as { ASSETS?: { fetch: typeof fetch } })?.ASSETS;

    const mcp = await mcpEndpoint(request, assets);
    if (mcp) return mcp;

    const accept = request.headers?.get?.("accept") ?? "";
    if (accept.includes("text/markdown") && !accept.includes("text/html")) {
      const url = new URL(request.url);
      const llms = assets
        ? await assets.fetch(new Request(new URL("/llms.txt", url)))
        : undefined;
      const body = llms?.ok
        ? await llms.text()
        : "# FontFridge\n\nSee /llms.txt";
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Link: LINK_HEADER,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

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
          "Cache-Control": "public, max-age=3600",
          "X-Robots-Tag": "noindex, follow",
          ...SECURITY_HEADERS,
        },
      });
    }

    const isGet = request.method === "GET";
    const isCacheableHome = isGet && url.pathname === "/" && url.search === "";
    const isCacheablePage =
      import.meta.env.PROD &&
      (isCacheableHome || (isGet && isCacheableDetail(url)));
    const cache = (caches as unknown as { default: Cache }).default;
    const key = isCacheablePage ? cacheKey(request) : request;
    if (isCacheablePage) {
      const hit = await cache.match(key);
      if (hit) return hit;
    }

    const res = await serverEntry.fetch(...args);

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return res;

    const next = new Response(res.body, res);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      next.headers.set(name, value);
    }
    next.headers.set("Link", LINK_HEADER);

    if (isCacheablePage && next.status === 200) {
      next.headers.set(
        "Cache-Control",
        `public, max-age=${
          isCacheableHome ? HOME_CACHE_SECONDS : DETAIL_CACHE_SECONDS
        }`
      );
      const ctx = (args as unknown[])[2] as ExecutionContext | undefined;
      const write = cache.put(key, next.clone());
      if (ctx?.waitUntil) ctx.waitUntil(write);
    }
    return next;
  },
};
