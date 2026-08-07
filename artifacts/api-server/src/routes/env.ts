import { Router } from "express";
import { RESOLVED_APP_ENV } from "@workspace/db";

const router = Router();

// GET /api/env — returns the current environment name for the frontend banners
router.get("/env", (_req, res) => {
  res.json({ appEnv: RESOLVED_APP_ENV });
});

export default router;
