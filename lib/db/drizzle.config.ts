import { defineConfig } from "drizzle-kit";
import path from "path";

// Resolve the correct database URL for the current environment
const APP_ENV = process.env.APP_ENV;

const DB_URL_MAP: Record<string, string> = {
  development: "DEVELOPMENT_DATABASE_URL",
  demo: "DEMO_DATABASE_URL",
  production: "PRODUCTION_DATABASE_URL",
};

const dbUrlKey = APP_ENV && DB_URL_MAP[APP_ENV] ? DB_URL_MAP[APP_ENV] : undefined;
const databaseUrl = dbUrlKey ? process.env[dbUrlKey] : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    APP_ENV
      ? `${dbUrlKey} must be set when APP_ENV=${APP_ENV}`
      : "DATABASE_URL or APP_ENV + matching DB URL must be set",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  out: "./drizzle",
});
