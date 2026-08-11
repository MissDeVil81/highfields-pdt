import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { isSchemaReady } from "../startup-state";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  // Block traffic until ensureSchemaExists() has completed successfully.
  // Cloud Run respects 503 as "not ready" and keeps trying before routing traffic.
  if (!isSchemaReady()) {
    res.status(503).json({ status: "starting", reason: "schema initializing" });
    return;
  }

  // Verify the database connection is still alive.
  // Release the client in a finally block to prevent pool exhaustion on errors.
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch {
    res.status(503).json({ status: "error", reason: "database unavailable" });
  } finally {
    client.release();
  }
});

export default router;
