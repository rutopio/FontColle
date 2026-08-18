import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Server: ASSETS binding (no HTTP hop). Client: plain fetch. */
export const assetFetch = createIsomorphicFn()
  .server(async (path: string, signal?: AbortSignal) => {
    const { env } = await import("cloudflare:workers");
    const origin = new URL(getRequest().url).origin;
    return env.ASSETS.fetch(new Request(`${origin}${path}`, { signal }));
  })
  .client((path: string, signal?: AbortSignal) => fetch(path, { signal }));
