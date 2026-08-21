import app from "./app";
import { logger } from "./lib/logger";
import {
  ensureSchemaExists,
  bootstrapProductionAdmin,
  seedIfEmpty,
  seedDemoProgressIfMissing,
  seedDemoProgressV2IfMissing,
  seedManagerPortalDataIfMissing,
  seedLdDemoDataIfMissing,
} from "./startup-seed";
import { setSchemaReady } from "./startup-state";
import { RESOLVED_APP_ENV } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Bind to the port immediately so the health check passes right away.
// Schema creation and seeding run in the background after the server is up.
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port, appEnv: RESOLVED_APP_ENV }, "Server listening");
});

// APP_ENV is the database isolation boundary and must be the sole source of
// truth for lifecycle decisions. NODE_ENV is only a build/runtime setting.
// In the live environment, apply schema but skip demo seeding — live data is
// managed outside the container lifecycle. APP_ENV is deliberately the source
// of truth rather than NODE_ENV: a demo server must still seed demo data even
// when it uses production-like Node settings.
const isProductionRuntime = RESOLVED_APP_ENV === "production";

// Run schema + seed in the background.
//
// The health check returns 503 until setSchemaReady() is called, so Cloud Run
// will not route production traffic before tables exist (see startup-state.ts
// and routes/health.ts). This closes the race where the server is "up" but the
// schema hasn't been applied yet.
//
// In production: schema errors are fatal — if ensureSchemaExists() fails, the
// process exits so Cloud Run restarts the container and tries again rather than
// serving 500s on every data route.
//
// In development: seed failures are non-fatal — a transient DB hiccup on first
// boot shouldn't kill the dev server, but schema failure still exits.
const startupChain = isProductionRuntime
  ? ensureSchemaExists().then(() => bootstrapProductionAdmin()).then(() => {
      setSchemaReady();
      logger.info("Schema ready — health check will now return 200");
    })
  : ensureSchemaExists()
      .then(() => {
        setSchemaReady();
      })
      .then(() => seedIfEmpty())
      .then(() => seedDemoProgressIfMissing())
      .then(() => seedDemoProgressV2IfMissing())
      .then(() => seedManagerPortalDataIfMissing())
      .then(() => seedLdDemoDataIfMissing());

startupChain.catch((err) => {
  if (isProductionRuntime) {
    logger.error({ err }, "Schema setup failed in production — exiting so the container can restart");
    process.exit(1);
  } else {
    logger.error({ err }, "Startup seed failed (non-fatal, server still running)");
    // Still mark schema ready in dev if ensureSchemaExists succeeded but a seed step failed
    // (setSchemaReady was already called before the seed chain)
  }
});
