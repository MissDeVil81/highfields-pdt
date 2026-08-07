/**
 * APP_ENV — identifies which deployment environment is running.
 * Validated at API server startup; exported here so other packages
 * can import a single typed constant without re-reading process.env.
 */
export type AppEnv = "development" | "demo" | "production";

const raw = process.env.APP_ENV;

if (!raw || !["development", "demo", "production"].includes(raw)) {
  throw new Error(
    `APP_ENV must be "development", "demo", or "production". Got: ${JSON.stringify(raw)}`,
  );
}

export const APP_ENV = raw as AppEnv;
