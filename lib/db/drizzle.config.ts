import { defineConfig } from "drizzle-kit";
import path from "path";

/**
 * Drizzle configuration — same URL resolution as lib/db/src/index.ts.
 *
 * Priority:
 *  1. APP_ENV-specific secret (DEVELOPMENT_DATABASE_URL / DEMO_DATABASE_URL / PRODUCTION_DATABASE_URL)
 *  2. DATABASE_URL — Replit auto-injects this for every repl's built-in Postgres database.
 */
const APP_ENV = process.env.APP_ENV ?? "development";

const DB_URL_KEY: Record<string, string> = {
  development: "DEVELOPMENT_DATABASE_URL",
  demo: "DEMO_DATABASE_URL",
  production: "PRODUCTION_DATABASE_URL",
};

const dbUrlKey = DB_URL_KEY[APP_ENV];
const url = process.env[dbUrlKey] ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    `No database URL found. Set ${dbUrlKey} or DATABASE_URL (APP_ENV=${APP_ENV}).`,
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: { url },
});
