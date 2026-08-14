import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Isomorphic fetch for static catalog assets. On the server, routes through the
 * Workers ASSETS binding to avoid an external HTTP hop; on the client, a plain
 * fetch against the same origin.
 */
export const assetFetch = createIsomorphicFn()
  .server(async (path: string, signal?: AbortSignal) => {
    const { env } = await import("cloudflare:workers");
    const origin = new URL(getRequest().url).origin;
    return env.ASSETS.fetch(new Request(`${origin}${path}`, { signal }));
  })
  .client((path: string, signal?: AbortSignal) => fetch(path, { signal }));
