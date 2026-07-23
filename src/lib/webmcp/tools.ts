// WebMCP tool definitions: the site's key actions exposed to an in-browser AI
// agent via navigator.modelContext. Tools drive the real UI rather than
// answering out of band — search_fonts writes the filter URL, so the user
// watches the list narrow and can carry on from wherever the agent left them.
//
// The API is a W3C WebML CG proposal (webmachinelearning.github.io/webmcp),
// shipping behind Chrome's Early Preview Program and not in any stable browser.
// Everything here is feature-detected and a no-op when absent; see ./register.

import type { QueryClient } from "@tanstack/react-query";
import type { AnyRouter } from "@tanstack/react-router";
import { catalogQueryOptions } from "@/lib/fonts/catalog";
import {
  applyFilters,
  emptyFilter,
  type FilterSearch,
  filterToSearch,
  searchByQuery,
} from "@/lib/fonts/filter";
import type { FontRecord } from "@/lib/fonts/types";

// The `category` facet's full domain (see catalog-slim.json). Enumerated in the
// schema so an agent picks a real bucket instead of guessing "sans-serif".
const CATEGORIES = [
  "Sans",
  "Serif",
  "Slab",
  "Mono",
  "Display",
  "Script",
  "Graphics",
  "Emoji",
] as const;

// How many ids a search returns. The full match set can be ~800 families, which
// is both useless in a model's context and slow to serialise; the count field
// carries the real total, and the user sees every match on screen.
const MAX_IDS = 50;

export interface ToolContext {
  router: AnyRouter;
  queryClient: QueryClient;
}

// A WebMCP tool's execute() resolves to MCP content blocks. Only text is used
// here; the shape matches MCP's CallToolResult so a host can pass it straight
// through.
interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

const json = (value: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

const failure = (message: string): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify({ error: message }) }],
  isError: true,
});

// Read an argument as a string array, accepting a bare string for the common
// single-value call (`{ features: "smcp" }`). Non-string entries are dropped
// rather than coerced, so a malformed arg narrows nothing instead of filtering
// on "[object Object]".
function strings(value: unknown): string[] {
  if (typeof value === "string") return value ? [value] : [];
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v !== "");
}

async function catalog(ctx: ToolContext): Promise<FontRecord[]> {
  return ctx.queryClient.fetchQuery(catalogQueryOptions());
}

// Project a record down to what an agent needs to describe a result. The full
// record is ~7 KB; a 50-item page of these is a few KB total.
function summarise(font: FontRecord) {
  return {
    id: font.id,
    name: font.name,
    category: font.category,
    isVariable: font.isVariable,
    isMonospace: font.isMonospace,
    designer: font.designer,
    url: `https://fontcolle.com/instances/${font.id}`,
  };
}

export function buildTools(ctx: ToolContext): ToolDefinition[] {
  return [
    {
      name: "search_fonts",
      description:
        "Filter the FontColle catalog of open-source Google Fonts and apply " +
        "that filter to the page the user is looking at. The font list and " +
        "the URL both update, so the user sees the results and can keep " +
        "browsing from there. Returns the match count and the first " +
        `${MAX_IDS} families.`,
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Free-text search over family name, designer, and foundry.",
          },
          category: {
            type: "array",
            items: { type: "string", enum: CATEGORIES },
            description: "Primary style buckets. Multiple values are OR-ed.",
          },
          variable: {
            type: "boolean",
            description:
              "true = variable fonts only, false = static fonts only.",
          },
          monospace: {
            type: "boolean",
            description: "true = monospaced families only.",
          },
          features: {
            type: "array",
            items: { type: "string" },
            description:
              "OpenType feature tags a family must have, e.g. smcp, onum, " +
              "ss01. AND-ed across values.",
          },
          axes: {
            type: "array",
            items: { type: "string" },
            description:
              "Variable-axis tags a family must expose, e.g. wght, wdth, " +
              "slnt, opsz. AND-ed across values.",
          },
          scripts: {
            type: "array",
            items: { type: "string" },
            description:
              "Writing systems a family must cover, as script codes: Latn, " +
              "Cyrl, Grek, Arab, Hebr, Deva, Hans, Hant, Jpan, Kore.",
          },
          weights: {
            type: "array",
            items: { type: "string" },
            description:
              'Standard weight steps the family must offer, "100" to "900".',
          },
        },
        additionalProperties: false,
      },
      execute: async (args) => {
        const fonts = await catalog(ctx);
        // Build on emptyFilter, not the current URL: an agent call states the
        // whole query it means, so leaving the user's stale filters underneath
        // would silently over-narrow the result.
        const filter = { ...emptyFilter };
        if (typeof args.query === "string") filter.query = args.query;
        filter.categories = strings(args.category);
        filter.features = strings(args.features);
        filter.axes = strings(args.axes);
        filter.scripts = strings(args.scripts);
        filter.weights = strings(args.weights);
        if (typeof args.variable === "boolean")
          filter.tags = [args.variable ? "variable" : "static"];
        // Monospace is a category, not a separate facet, so it merges into the
        // category list rather than overwriting an explicit category.
        if (args.monospace === true && !filter.categories.includes("Mono"))
          filter.categories = [...filter.categories, "Mono"];

        // Same two-pass order the list view uses: applyFilters is the pure
        // facet gate, then searchByQuery both filters and ranks by relevance.
        const matches = searchByQuery(
          applyFilters(fonts, filter),
          filter.query
        );
        // Writing the URL is what moves the UI: the list route validates search
        // params back into this same FilterState, so the page re-renders with
        // exactly the filter that produced `matches`.
        const search = filterToSearch(filter) satisfies FilterSearch;
        await ctx.router.navigate({ to: "/", search });

        return json({
          count: matches.length,
          appliedUrl: `https://fontcolle.com/${ctx.router.buildLocation({ to: "/", search }).searchStr}`,
          fonts: matches.slice(0, MAX_IDS).map(summarise),
          truncated: matches.length > MAX_IDS,
        });
      },
    },
    {
      name: "get_font",
      description:
        "Get the full record for one font family: metrics, OpenType features, " +
        "variable axes, named instances, writing systems, license, and " +
        "repository. Use the id returned by search_fonts.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description:
              'Family id: the lowercased name with spaces removed, e.g. "robotoslab".',
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const id = typeof args.id === "string" ? args.id : "";
        if (!id) return failure("id is required");
        // Read the family out of the loaded catalog rather than fetching
        // /catalog/{id}.json: the catalog is already in the query cache here,
        // so this stays a local lookup with no extra request.
        const fonts = await catalog(ctx);
        const font = fonts.find((f) => f.id === id);
        if (!font)
          return failure(
            `No font with id "${id}". Call search_fonts to find valid ids.`
          );
        return json(font);
      },
    },
    {
      name: "open_font_page",
      description:
        "Navigate the page the user is looking at to one font family's detail " +
        "view, showing its specimen, glyphs, and metrics.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: 'Family id, e.g. "robotoslab".',
          },
          tab: {
            type: "string",
            enum: ["instances", "glyphs", "metrics", "about"],
            description: "Which detail tab to open. Defaults to instances.",
          },
        },
        required: ["id"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const id = typeof args.id === "string" ? args.id : "";
        if (!id) return failure("id is required");
        const fonts = await catalog(ctx);
        const font = fonts.find((f) => f.id === id);
        // Navigating to a non-existent slug would land the user on a 404, so
        // validate against the catalog before moving them.
        if (!font)
          return failure(
            `No font with id "${id}". Call search_fonts to find valid ids.`
          );
        const tab = typeof args.tab === "string" ? args.tab : "instances";
        await ctx.router.navigate({
          to: "/$tab/$fontId",
          params: { tab, fontId: id },
        });
        return json({
          opened: font.name,
          url: `https://fontcolle.com/${tab}/${id}`,
        });
      },
    },
  ];
}
