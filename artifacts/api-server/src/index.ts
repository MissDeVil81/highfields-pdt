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

// In production, skip demo seeding — live data is created via seed scripts.
const seedChain =
  ensureSchemaExists()
    .then(() => RESOLVED_APP_ENV === "production"
      ? Promise.resolve()
      : seedIfEmpty()
          .then(() => seedDemoProgressIfMissing())
          .then(() => seedDemoProgressV2IfMissing())
          .then(() => seedManagerPortalDataIfMissing())
          .then(() => seedLdDemoDataIfMissing())
    );

seedChain
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port, appEnv: RESOLVED_APP_ENV }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Startup seed failed, aborting");
    process.exit(1);
  });
