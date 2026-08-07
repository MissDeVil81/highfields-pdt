import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { APP_ENV } from "./env";

const { Pool } = pg;

/**
 * Database URL resolution — strict per-environment isolation.
 *
 * Each environment requires its own explicit database URL secret.
 * No fallback to DATABASE_URL is allowed; a misconfigured repl cannot
 * accidentally connect to another environment's database.
 *
 *   APP_ENV=development → DEVELOPMENT_DATABASE_URL (required)
 *   APP_ENV=demo        → DEMO_DATABASE_URL        (required)
 *   APP_ENV=production  → PRODUCTION_DATABASE_URL  (required)
 */
const DB_URL_KEY = {
  development: "DEVELOPMENT_DATABASE_URL",
  demo: "DEMO_DATABASE_URL",
  production: "PRODUCTION_DATABASE_URL",
} as const satisfies Record<typeof APP_ENV, string>;

const dbUrlKey = DB_URL_KEY[APP_ENV];
const connectionString = process.env[dbUrlKey];

if (!connectionString) {
  console.error(
    `[DB] ${dbUrlKey} is required when APP_ENV=${APP_ENV}. ` +
      "Set this secret in the Replit Secrets panel before starting the server.",
  );
  process.exit(1);
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

/** The current environment name. */
export const RESOLVED_APP_ENV: "development" | "demo" | "production" = APP_ENV;

export * from "./schema";
export { APP_ENV } from "./env";
