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
import {
  MCP_CATEGORIES,
  MCP_MAX_RESULTS,
  mcpStrings,
  mcpSummarise,
} from "@/lib/fonts/mcp-shared";
import type { FontRecord } from "@/lib/fonts/types";

export interface ToolContext {
  router: AnyRouter;
  queryClient: QueryClient;
}

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

async function catalog(ctx: ToolContext): Promise<FontRecord[]> {
  return ctx.queryClient.fetchQuery(catalogQueryOptions());
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
        `${MCP_MAX_RESULTS} families.`,
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
            items: { type: "string", enum: MCP_CATEGORIES },
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
        const filter = { ...emptyFilter };
        if (typeof args.query === "string") filter.query = args.query;
        filter.categories = mcpStrings(args.category);
        filter.features = mcpStrings(args.features);
        filter.axes = mcpStrings(args.axes);
        filter.scripts = mcpStrings(args.scripts);
        filter.weights = mcpStrings(args.weights);
        if (typeof args.variable === "boolean")
          filter.tags = [args.variable ? "variable" : "static"];
        if (args.monospace === true && !filter.categories.includes("Mono"))
          filter.categories = [...filter.categories, "Mono"];

        const matches = searchByQuery(
          applyFilters(fonts, filter),
          filter.query
        );
        const search = filterToSearch(filter) satisfies FilterSearch;
        await ctx.router.navigate({ to: "/", search });

        return json({
          count: matches.length,
          appliedUrl: `https://fontcolle.com/${ctx.router.buildLocation({ to: "/", search }).searchStr}`,
          fonts: matches.slice(0, MCP_MAX_RESULTS).map(mcpSummarise),
          truncated: matches.length > MCP_MAX_RESULTS,
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
