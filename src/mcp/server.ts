import type { FontRecord } from "@/lib/fonts/types";

// Slim projection of FontRecord used by catalog-slim.json.
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

const MAX_RESULTS = 50;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

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

let catalogCache: SlimFont[] | undefined;

async function loadCatalog(
  assets: AssetsBinding,
  origin: string
): Promise<SlimFont[]> {
  if (catalogCache) return catalogCache;
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
    if (features.length && !features.every((f) => font.features.includes(f)))
      return false;
    if (axes.length && !axes.every((a) => font.axes.includes(a))) return false;
    if (scripts.length && !scripts.every((s) => font.scripts.includes(s)))
      return false;
    if (weights.length && !weights.every((w) => font.weights.includes(w)))
      return false;
    if (query) {
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

async function getFont(
  assets: AssetsBinding,
  origin: string,
  id: string
): Promise<unknown> {
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
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });

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

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, mcp-protocol-version",
  };

  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });

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
  if (!response) return new Response(null, { status: 202, headers: cors });

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
