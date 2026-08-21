import { Router, type IRouter, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { getSeedState, isSchemaReady } from "../startup-state";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const handleHealthCheck = async (_req: Request, res: Response) => {
  const seedState = getSeedState();

  if (seedState.status === "failed" || seedState.status === "partial") {
    res.status(503).json({
      status: "degraded",
      reason: "demo seed data is incomplete",
      seedStatus: seedState.status,
      failedSeedSteps: seedState.failedSteps,
    });
    return;
  }

  // Block traffic until ensureSchemaExists() has completed successfully.
  // Cloud Run respects 503 as "not ready" and keeps trying before routing traffic.
  if (!isSchemaReady()) {
    res.status(503).json({
      status: "starting",
      reason: "schema and demo data are initializing",
      seedStatus: seedState.status,
      failedSeedSteps: seedState.failedSteps,
    });
    return;
  }

  // Verify the database connection is still alive. Acquiring a connection can
  // fail too, so keep it inside the guarded path and only release a client that
  // was actually obtained.
  let client:
    | {
        query(sql: string): Promise<unknown>;
        release(): void;
      }
    | undefined;
  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    const data = HealthCheckResponse.parse({
      status: "ok",
      seedStatus: seedState.status,
      failedSeedSteps: seedState.failedSteps,
    });
    res.json(data);
  } catch {
    res.status(503).json({
      status: "error",
      reason: "database unavailable",
      seedStatus: seedState.status,
      failedSeedSteps: seedState.failedSteps,
    });
  } finally {
    client?.release();
  }
};

router.get("/healthz", handleHealthCheck);
// Artifact deployments may probe the service mount root (/api) even when a
// custom startup path is configured. Keep that probe independent of routing
// details while preserving the explicit /api/healthz endpoint.
router.get("/", handleHealthCheck);

export default router;
