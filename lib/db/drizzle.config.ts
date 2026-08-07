import { defineConfig } from "drizzle-kit";
import path from "path";

/**
 * Drizzle configuration — strict per-environment database URL.
 *
 * The APP_ENV environment variable selects which secret to read.
 * When APP_ENV is unset (e.g. running drizzle-kit directly in development
 * without APP_ENV), DEVELOPMENT_DATABASE_URL is assumed.
 */
const APP_ENV = process.env.APP_ENV ?? "development";

const DB_URL_KEY: Record<string, string> = {
  development: "DEVELOPMENT_DATABASE_URL",
  demo: "DEMO_DATABASE_URL",
  production: "PRODUCTION_DATABASE_URL",
};

const dbUrlKey = DB_URL_KEY[APP_ENV];
const url = process.env[dbUrlKey];

if (!url) {
  throw new Error(
    `${dbUrlKey} is required (APP_ENV=${APP_ENV}). ` +
      "Ensure the database is provisioned and the secret is set.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: { url },
});
