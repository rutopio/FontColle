// Registers the WebMCP tools with the browser, if it supports WebMCP at all.
//
// The proposal is still moving and two call shapes are in the wild: the older
// batch `provideContext({ tools })` and the newer per-tool `registerTool()`
// with an AbortSignal for teardown. Both are probed, newest first, so the site
// works under whichever the visitor's browser implements. No browser ships this
// on stable today, so the normal path is the early return.

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { buildTools, type ToolDefinition } from "./tools";

interface ModelContext {
  registerTool?: (
    tool: ToolDefinition & { signal?: AbortSignal }
  ) => void | Promise<void>;
  provideContext?: (context: {
    tools: ToolDefinition[];
  }) => void | Promise<void>;
}

function modelContext(): ModelContext | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { modelContext?: ModelContext })
    .modelContext;
}

/** Expose the site's tools to an in-browser agent for as long as the app is
 *  mounted. No-op without WebMCP support, which is every stable browser today. */
export function useWebMcp(): void {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const ctx = modelContext();
    if (!ctx) return;

    const controller = new AbortController();
    const tools = buildTools({ router, queryClient });

    // Tool execution hits the router and the catalog query, and a rejected
    // promise here would surface as an unhandled rejection rather than a tool
    // error, so failures are reported back to the agent as text instead.
    const guarded = tools.map((tool) => ({
      ...tool,
      execute: async (args: Record<string, unknown>) => {
        try {
          return await tool.execute(args);
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: error instanceof Error ? error.message : String(error),
                }),
              },
            ],
            isError: true,
          };
        }
      },
    }));

    if (typeof ctx.registerTool === "function") {
      for (const tool of guarded)
        void ctx.registerTool({ ...tool, signal: controller.signal });
    } else if (typeof ctx.provideContext === "function") {
      void ctx.provideContext({ tools: guarded });
    }

    // registerTool unregisters via the signal. provideContext has no teardown
    // in the proposal, so re-providing an empty tool list is the closest
    // equivalent; it only runs on unmount, which in this SPA means teardown.
    return () => {
      controller.abort();
      if (typeof ctx.registerTool !== "function")
        void ctx.provideContext?.({ tools: [] });
    };
  }, [router, queryClient]);
}
