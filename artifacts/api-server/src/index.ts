import app from "./app";
import { logger } from "./lib/logger";
import {
  ensureSchemaExists,
  seedIfEmpty,
  seedDemoProgressIfMissing,
  seedDemoProgressV2IfMissing,
  seedManagerPortalDataIfMissing,
  seedLdDemoDataIfMissing,
} from "./startup-seed";
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

// In production (Cloud Run / autoscale), apply schema but skip demo seeding —
// live data is managed outside the container lifecycle.
// NODE_ENV is set to "production" by artifact.toml, so it is the reliable signal.
const isProductionRuntime = process.env["NODE_ENV"] === "production";

// Run schema + seed in background — failures are logged but do not crash the
// server, so a transient DB hiccup on first boot doesn't take down the app.
const startupChain = isProductionRuntime
  ? ensureSchemaExists()
  : ensureSchemaExists()
      .then(() => seedIfEmpty())
      .then(() => seedDemoProgressIfMissing())
      .then(() => seedDemoProgressV2IfMissing())
      .then(() => seedManagerPortalDataIfMissing())
      .then(() => seedLdDemoDataIfMissing());

startupChain.catch((err) => {
  logger.error({ err }, "Startup seed failed (non-fatal, server still running)");
});
