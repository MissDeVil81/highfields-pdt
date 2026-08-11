/**
 * APP_ENV — identifies which deployment environment is running.
 * Validated at API server startup; exported here so other packages
 * can import a single typed constant without re-reading process.env.
 */
export type AppEnv = "development" | "demo" | "production";

// APP_ENV is the primary signal. In the production container, NODE_ENV=production
// is hardcoded in artifact.toml's [services.production.run.env], so we fall back
// to that when APP_ENV is absent — this avoids needing APP_ENV as an injected
// secret in the production runtime.
const raw =
  process.env.APP_ENV ??
  (process.env.NODE_ENV === "production" ? "production" : undefined);

if (!raw || !["development", "demo", "production"].includes(raw)) {
  throw new Error(
    `APP_ENV must be "development", "demo", or "production". Got: ${JSON.stringify(raw)}`,
  );
}

export const APP_ENV = raw as AppEnv;
