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

export function useWebMcp(): void {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const ctx = modelContext();
    if (!ctx) return;

    const controller = new AbortController();
    const tools = buildTools({ router, queryClient });

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

    // provideContext has no teardown API; re-provide an empty list on unmount.
    return () => {
      controller.abort();
      if (typeof ctx.registerTool !== "function")
        void ctx.provideContext?.({ tools: [] });
    };
  }, [router, queryClient]);
}
