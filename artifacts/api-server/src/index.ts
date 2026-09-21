import app from "./app";
import { logger } from "./lib/logger";
import {
  ensureSchemaExists,
  seedIfEmpty,
  seedDemoProgressIfMissing,
  seedDemoProgressV2IfMissing,
  seedManagerPortalDataIfMissing,
  seedHarryMonth6ProbationIfMissing,
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

// Live schema and data are managed outside the production container lifecycle.
// NODE_ENV is set to "production" by artifact.toml.
const isProductionRuntime = process.env["NODE_ENV"] === "production";

if (isProductionRuntime) {
  logger.info("Automatic schema management and seeding are disabled in production");
}

// Development initialization runs in the background. Production startup performs
// no schema or data mutations.
const startupChain = isProductionRuntime
  ? Promise.resolve()
  : ensureSchemaExists()
      .then(() => seedIfEmpty())
      .then(() => seedDemoProgressIfMissing())
      .then(() => seedManagerPortalDataIfMissing())
      .then(() => seedHarryMonth6ProbationIfMissing())
      .then(() => seedDemoProgressV2IfMissing())
      .then(() => seedLdDemoDataIfMissing());

startupChain.catch((err) => {
  logger.error(
    { err },
    "Development startup initialization failed (non-fatal, server still running)",
  );
});
