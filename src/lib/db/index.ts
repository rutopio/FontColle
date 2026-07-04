import { env as workerEnv } from "cloudflare:workers";
import { createServerOnlyFn } from "@tanstack/react-start";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/db/schema";

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
    }
  }
}

const createDb = createServerOnlyFn(() =>
  drizzle(workerEnv.DB, { schema, casing: "snake_case" })
);

export type Database = ReturnType<typeof createDb>;

// Fresh drizzle instance per property access so no state leaks between requests.
// The D1 binding has no per-request socket, so this is cheap.
export const db: Database = new Proxy({} as Database, {
  get(_, prop) {
    const instance = createDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[
      prop
    ];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
