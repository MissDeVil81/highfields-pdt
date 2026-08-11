import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { APP_ENV } from "./env";

const { Pool } = pg;

/**
 * Database URL resolution — strict per-environment isolation.
 *
 * In development and demo, each environment requires its own explicit secret
 * so a misconfigured repl cannot accidentally connect to the wrong database.
 *
 *   APP_ENV=development → DEVELOPMENT_DATABASE_URL (required)
 *   APP_ENV=demo        → DEMO_DATABASE_URL        (required)
 *
 * In production (Cloud Run), Replit injects DATABASE_URL with the correct
 * external-facing connection string automatically. PRODUCTION_DATABASE_URL
 * can override it for custom database setups, but DATABASE_URL is the
 * reliable default because it is Replit-managed and always environment-correct.
 *
 *   APP_ENV=production  → DATABASE_URL (runtime-managed by Replit)
 *                         or PRODUCTION_DATABASE_URL (user-managed override)
 */
const DB_URL_KEY = {
  development: "DEVELOPMENT_DATABASE_URL",
  demo: "DEMO_DATABASE_URL",
} as const satisfies Record<Exclude<typeof APP_ENV, "production">, string>;

let connectionString: string | undefined;

if (APP_ENV === "production") {
  // In Cloud Run, DATABASE_URL is injected by Replit with the correct external
  // hostname. PRODUCTION_DATABASE_URL is a user-managed override; prefer
  // DATABASE_URL so the server works correctly out of the box even if the
  // PRODUCTION_DATABASE_URL secret contains the internal workspace hostname.
  connectionString =
    process.env["DATABASE_URL"] ?? process.env["PRODUCTION_DATABASE_URL"];
  if (!connectionString) {
    console.error(
      "[DB] Neither DATABASE_URL nor PRODUCTION_DATABASE_URL is set in production. " +
        "Replit should inject DATABASE_URL automatically; check deployment configuration.",
    );
    process.exit(1);
  }
} else {
  const dbUrlKey = DB_URL_KEY[APP_ENV];
  connectionString = process.env[dbUrlKey];
  if (!connectionString) {
    console.error(
      `[DB] ${dbUrlKey} is required when APP_ENV=${APP_ENV}. ` +
        "Set this secret in the Replit Secrets panel before starting the server.",
    );
    process.exit(1);
  }
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

/** The current environment name. */
export const RESOLVED_APP_ENV: "development" | "demo" | "production" = APP_ENV;

export * from "./schema";
export { APP_ENV } from "./env";
