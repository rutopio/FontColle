// Remote MCP server: the same three actions the in-browser WebMCP tools expose
// (see lib/webmcp/tools.ts), reachable over HTTP so a desktop client like Claude
// Desktop or Cursor can use the catalog without opening the site.
//
// Streamable HTTP transport, JSON-RPC 2.0 over a single POST /mcp endpoint. Only
// the three methods a tools-only server needs are implemented: initialize,
// tools/list, tools/call (plus notifications/initialized, which takes no reply).
//
// Data comes from /catalog-slim.json (~2 MB) via the ASSETS binding, never
// /catalog.json (~10 MB): parsing the full catalog in a Worker blows the CPU
// limit (Error 1102). The slim projection carries every field these tools
// filter on.
import type { FontRecord } from "@/lib/fonts/types";

// The subset of FontRecord that catalog-slim.json actually carries. Declared
// separately from FontRecord because the slim projection drops most fields, and
// typing it as the full record would invite reading ones that are absent.
//
// Two fields are reshaped by the projection rather than merely dropped: `axes`
// is flattened from FontAxis objects to bare tag strings ("wght"), and `weights`
// is numeric. Both are declared here instead of Pick-ed, or the inherited type
// would not match the bytes on the wire.
type SlimFont = Pick<
  FontRecord,
  | "id"
  | "name"
  | "category"
  | "isVariable"
  | "isMonospace"
  | "designer"
  | "features"
  | "scripts"
  | "facets"
> & { axes: string[]; weights: number[] };

const SERVER_NAME = "fontcolle";
const SERVER_VERSION = "1.0.0";
// The MCP revision this server implements. Echoed back from initialize.
const PROTOCOL_VERSION = "2025-06-18";

const CATEGORIES = [
  "Sans",
  "Serif",
  "Slab",
  "Mono",
  "Display",
  "Script",
  "Graphics",
  "Emoji",
];

// Cap on returned families, for the same reason as the WebMCP tools: a filter
// can match ~800 records and a model does not want them all. `count` carries the
// true total.
const MAX_RESULTS = 50;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

// JSON-RPC error codes used here. -32601/-32700 are standard; -32602 covers a
// call naming an unknown tool or missing a required argument.
const PARSE_ERROR = -32700;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

const TOOLS = [
  {
    name: "search_fonts",
    description:
      "Search the FontColle catalog of open-source Google Fonts by style " +
      "category, OpenType features, variable axes, writing system, and " +
      "weight. Returns the match count and the first " +
      `${MAX_RESULTS} families.`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Free-text match against family name and designer name.",
        },
        category: {
          type: "array",
          items: { type: "string", enum: CATEGORIES },
          description: "Primary style buckets. Multiple values are OR-ed.",
        },
        variable: {
          type: "boolean",
          description: "true = variable fonts only, false = static fonts only.",
        },
        monospace: { type: "boolean", description: "true = monospaced only." },
        features: {
          type: "array",
          items: { type: "string" },
          description:
            "OpenType feature tags the family must have (smcp, onum, ss01, …). " +
            "AND-ed across values.",
        },
        axes: {
          type: "array",
          items: { type: "string" },
          description:
            "Variable axis tags the family must expose (wght, wdth, slnt, " +
            "opsz, …). AND-ed across values.",
        },
        scripts: {
          type: "array",
          items: { type: "string" },
          description:
            "Writing systems the family must cover, as script codes: Latn, " +
            "Cyrl, Grek, Arab, Hebr, Deva, Hans, Hant, Jpan, Kore.",
        },
        weights: {
          type: "array",
          items: { type: "integer" },
          description: "Weight steps the family must offer, 100 to 900.",
        },
        limit: {
          type: "integer",
          description: `Max families to return (1-${MAX_RESULTS}).`,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_font",
    description:
      "Get the full record for one family: metrics, OpenType features, " +
      "variable axes, named instances, writing systems, license, repository, " +
      "and version history. Use an id from search_fonts.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            'Family id: lowercased name with spaces removed, e.g. "robotoslab".',
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_categories",
    description:
      "List the style categories with how many families each holds. Useful " +
      "as a first call to see the shape of the catalog.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

interface AssetsBinding {
  fetch: (request: Request) => Promise<Response>;
}

// Per-isolate memo of the parsed slim catalog. A Worker isolate serves many
// requests, so the ~2 MB parse happens once per cold start rather than per call.
let catalogCache: SlimFont[] | undefined;

async function loadCatalog(
  assets: AssetsBinding,
  origin: string
): Promise<SlimFont[]> {
  if (catalogCache) return catalogCache;
  // Fetch through the ASSETS binding, not the public URL: a Worker fetching its
  // own hostname would recurse back into this handler.
  const res = await assets.fetch(
    new Request(new URL("/catalog-slim.json", origin))
  );
  if (!res.ok) throw new Error(`catalog unavailable (${res.status})`);
  catalogCache = (await res.json()) as SlimFont[];
  return catalogCache;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return value ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v !== "");
}

// Weights arrive as numbers in the slim catalog but a model may send either, so
// accept both spellings and compare numerically.
function numbers(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : value == null ? [] : [value];
  return raw
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => Number.isFinite(n));
}

function summarise(font: SlimFont) {
  return {
    id: font.id,
    name: font.name,
    category: font.category,
    isVariable: font.isVariable,
    isMonospace: font.isMonospace,
    designer: font.designer,
    axes: font.axes,
    url: `https://fontcolle.com/instances/${font.id}`,
  };
}

function searchFonts(fonts: SlimFont[], args: Record<string, unknown>) {
  const categories = strings(args.category);
  const features = strings(args.features);
  const axes = strings(args.axes);
  const scripts = strings(args.scripts);
  const weights = numbers(args.weights);
  const query =
    typeof args.query === "string" ? args.query.trim().toLowerCase() : "";

  const matched = fonts.filter((font) => {
    if (categories.length && !categories.includes(font.category)) return false;
    if (typeof args.variable === "boolean" && font.isVariable !== args.variable)
      return false;
    if (args.monospace === true && !font.isMonospace) return false;
    // AND semantics across each multi-value facet, matching the site's default
    // combine mode for these sections.
    if (features.length && !features.every((f) => font.features.includes(f)))
      return false;
    if (axes.length && !axes.every((a) => font.axes.includes(a))) return false;
    if (scripts.length && !scripts.every((s) => font.scripts.includes(s)))
      return false;
    if (weights.length && !weights.every((w) => font.weights.includes(w)))
      return false;
    if (query) {
      // Plain substring match, not the site's fuzzy uFuzzy pass: loading the
      // fuzzy index in the Worker costs CPU this endpoint does not have, and an
      // agent sends deliberate terms rather than typos.
      const hay = `${font.name} ${font.designer ?? ""}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const limit = Math.min(
    Math.max(1, numbers(args.limit)[0] || MAX_RESULTS),
    MAX_RESULTS
  );
  return {
    count: matched.length,
    truncated: matched.length > limit,
    fonts: matched.slice(0, limit).map(summarise),
  };
}

// The full per-family record lives in its own asset, so get_font reads that
// rather than the slim projection — this is the one call that should return
// metrics, instances, and version history.
async function getFont(
  assets: AssetsBinding,
  origin: string,
  id: string
): Promise<unknown> {
  // Ids are lowercase slugs (see lib/fonts/slug.ts). Reject anything else
  // before it reaches the asset path.
  if (!/^[a-z0-9]+$/.test(id))
    throw new Error(
      `Invalid id "${id}". Ids are lowercase, e.g. "robotoslab".`
    );
  const res = await assets.fetch(
    new Request(new URL(`/catalog/${id}.json`, origin))
  );
  if (!res.ok)
    throw new Error(`No font with id "${id}". Use search_fonts to find ids.`);
  return res.json();
}

function listCategories(fonts: SlimFont[]) {
  const counts = new Map<string, number>();
  for (const font of fonts)
    counts.set(font.category, (counts.get(font.category) ?? 0) + 1);
  return {
    total: fonts.length,
    categories: [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

const ok = (id: JsonRpcRequest["id"], result: unknown) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

const err = (id: JsonRpcRequest["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

// A tool result carries its payload as text content. `isError: true` reports a
// tool-level failure (bad id, say) without failing the JSON-RPC call itself,
// which is what lets the model read the message and retry.
const toolText = (value: unknown, isError = false) => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  isError,
});

async function handleToolCall(
  assets: AssetsBinding,
  origin: string,
  params: Record<string, unknown>
) {
  const name = typeof params.name === "string" ? params.name : "";
  const args = (params.arguments ?? {}) as Record<string, unknown>;

  if (name === "get_font") {
    const id = typeof args.id === "string" ? args.id : "";
    if (!id) return toolText({ error: "id is required" }, true);
    try {
      return toolText(await getFont(assets, origin, id));
    } catch (error) {
      return toolText(
        { error: error instanceof Error ? error.message : String(error) },
        true
      );
    }
  }

  if (name === "search_fonts" || name === "list_categories") {
    const fonts = await loadCatalog(assets, origin);
    return toolText(
      name === "search_fonts" ? searchFonts(fonts, args) : listCategories(fonts)
    );
  }

  return undefined;
}

/** Handle a JSON-RPC request against the MCP server. Returns null for
 *  notifications, which take no response body. */
export async function handleMcpRequest(
  body: JsonRpcRequest,
  assets: AssetsBinding,
  origin: string
): Promise<object | null> {
  const { id, method, params = {} } = body;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        // Tools only: this server exposes no resources, prompts, or sampling.
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });

    // Notifications carry no id and must not be answered.
    case "notifications/initialized":
      return null;

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, { tools: TOOLS });

    case "tools/call": {
      const result = await handleToolCall(assets, origin, params);
      return result
        ? ok(id, result)
        : err(
            id,
            INVALID_PARAMS,
            `Unknown tool "${String(params.name ?? "")}". Call tools/list.`
          );
    }

    default:
      return err(id, METHOD_NOT_FOUND, `Unknown method "${method ?? ""}"`);
  }
}

/** Route a request to the MCP endpoint. Returns undefined when the request is
 *  not for /mcp, so the caller falls through to the normal SSR path. */
export async function mcpEndpoint(
  request: Request,
  assets: AssetsBinding | undefined
): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (url.pathname !== "/mcp") return undefined;

  // Browsers preflight a cross-origin POST carrying content-type: application/
  // json, and desktop MCP clients run from other origins, so the endpoint is
  // opened up deliberately. It is a read-only, unauthenticated view of data
  // that is already public, so there is nothing for a hostile origin to reach
  // that it could not fetch directly.
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, mcp-protocol-version",
  };

  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });

  // GET is what the Streamable HTTP transport uses to open an SSE stream for
  // server-initiated messages. This server only ever answers requests, so it
  // declines the stream per spec rather than holding a connection open.
  if (request.method !== "POST")
    return new Response(
      JSON.stringify(err(null, METHOD_NOT_FOUND, "Use POST for JSON-RPC.")),
      {
        status: 405,
        headers: { "Content-Type": "application/json", Allow: "POST", ...cors },
      }
    );

  if (!assets)
    return new Response(
      JSON.stringify(err(null, PARSE_ERROR, "Catalog unavailable.")),
      { status: 503, headers: { "Content-Type": "application/json", ...cors } }
    );

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return new Response(
      JSON.stringify(err(null, PARSE_ERROR, "Invalid JSON.")),
      { status: 400, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  const response = await handleMcpRequest(body, assets, url.origin);
  // A notification gets 202 with no body, which is what the transport expects.
  if (!response) return new Response(null, { status: 202, headers: cors });

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
