import type { Config } from "drizzle-kit";

// drizzle-kit emits Cloudflare D1 (SQLite) migrations.
//
// Workflow:
//   1. pnpm db generate       – diff schema vs. ./src/lib/db/migrations/*.sql
//   2. pnpm db:apply:local    – apply to local Miniflare D1 via wrangler
//   3. pnpm db:apply:remote   – apply to the live D1 via wrangler
export default {
  out: "./src/lib/db/migrations",
  schema: "./src/lib/db/schema/index.ts",
  breakpoints: true,
  verbose: true,
  strict: true,
  dialect: "sqlite",
  casing: "snake_case",
} satisfies Config;
