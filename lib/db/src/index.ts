import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const APP_ENV = process.env.APP_ENV as "development" | "demo" | "production" | undefined;

const DB_URL_MAP: Record<string, string> = {
  development: "DEVELOPMENT_DATABASE_URL",
  demo: "DEMO_DATABASE_URL",
  production: "PRODUCTION_DATABASE_URL",
};

let databaseUrl: string | undefined;

if (APP_ENV && DB_URL_MAP[APP_ENV]) {
  // ── Multi-environment mode ───────────────────────────────────────────────
  const dbUrlKey = DB_URL_MAP[APP_ENV];
  databaseUrl = process.env[dbUrlKey];

  if (!databaseUrl) {
    // Transition-period fallback: if the specific URL isn't set yet, fall back
    // to DATABASE_URL so the server stays up while secrets are being migrated.
    // In production this fallback is deliberately NOT available.
    if (APP_ENV === "production") {
      console.error(
        `[DB] PRODUCTION_DATABASE_URL is required when APP_ENV=production but was not set. ` +
          `Add it to the Live repl's secrets before starting the server.`,
      );
      process.exit(1);
    }
    databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      console.warn(
        `[DB] WARNING: ${dbUrlKey} is not set. Falling back to DATABASE_URL. ` +
          `Set ${dbUrlKey} as a secret in this repl for proper environment separation.`,
      );
    } else {
      console.error(
        `[DB] ${dbUrlKey} must be set when APP_ENV=${APP_ENV}. ` +
          `Add it to this repl's secrets.`,
      );
      process.exit(1);
    }
  }
} else if (!APP_ENV) {
  // ── Legacy fallback (no APP_ENV set at all) ──────────────────────────────
  databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[DB] DATABASE_URL must be set. Did you forget to provision a database?");
    process.exit(1);
  }
  console.warn(
    "[DB] WARNING: APP_ENV is not set. Using DATABASE_URL as a fallback. " +
      "Set APP_ENV=development|demo|production and the matching *_DATABASE_URL secret.",
  );
} else {
  console.error(
    `[DB] APP_ENV must be "development", "demo", or "production". Got: "${APP_ENV}"`,
  );
  process.exit(1);
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

/** The resolved environment name. Falls back to "development" when APP_ENV is unset. */
export const RESOLVED_APP_ENV: "development" | "demo" | "production" =
  APP_ENV ?? "development";

export * from "./schema";
