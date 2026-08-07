import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const APP_ENV = process.env.APP_ENV as "development" | "demo" | "production" | undefined;

/**
 * Database URL resolution — each repl uses its own isolated database.
 *
 * Priority (highest to lowest):
 *  1. APP_ENV-specific secret (DEVELOPMENT_DATABASE_URL / DEMO_DATABASE_URL / PRODUCTION_DATABASE_URL)
 *     — use this to point at an external/shared database when needed.
 *  2. DATABASE_URL — Replit auto-injects this for every repl's built-in Postgres database.
 *     In normal multi-repl setups this is all you need; isolation comes from forking, not
 *     from copying connection strings.
 *
 * Production is the only environment that refuses to start without a database URL; for
 * dev/demo the fallback to DATABASE_URL is always safe.
 */
const SPECIFIC_KEY: Record<string, string> = {
  development: "DEVELOPMENT_DATABASE_URL",
  demo: "DEMO_DATABASE_URL",
  production: "PRODUCTION_DATABASE_URL",
};

function resolveUrl(): string {
  const specificKey = APP_ENV ? SPECIFIC_KEY[APP_ENV] : undefined;
  const specificUrl = specificKey ? process.env[specificKey] : undefined;

  if (specificUrl) {
    return specificUrl;
  }

  // Fall back to the Replit-managed DATABASE_URL
  const fallbackUrl = process.env.DATABASE_URL;

  if (!fallbackUrl) {
    // For production, refuse to start without an explicit connection string.
    if (APP_ENV === "production") {
      console.error(
        "[DB] Neither PRODUCTION_DATABASE_URL nor DATABASE_URL is set. " +
          "Provision a database in this repl or set PRODUCTION_DATABASE_URL.",
      );
      process.exit(1);
    }
    console.error("[DB] No database URL found. Did you forget to add a database to this repl?");
    process.exit(1);
  }

  if (APP_ENV && specificKey) {
    console.warn(
      `[DB] ${specificKey} not set — falling back to DATABASE_URL (Replit managed). ` +
        `This is fine for a single-repl setup. Set ${specificKey} only if you need to point at an external database.`,
    );
  } else if (!APP_ENV) {
    console.warn(
      "[DB] APP_ENV is not set — using DATABASE_URL and defaulting environment to 'development'. " +
        "Set APP_ENV=development|demo|production for proper environment labelling.",
    );
  }

  return fallbackUrl;
}

const databaseUrl = resolveUrl();

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

/** The resolved environment name. Falls back to "development" when APP_ENV is unset. */
export const RESOLVED_APP_ENV: "development" | "demo" | "production" =
  (APP_ENV as "development" | "demo" | "production" | undefined) ?? "development";

export * from "./schema";
