import { Router } from "express";
import { RESOLVED_APP_ENV } from "@workspace/db";
import { resolveProductionUser } from "../middlewares/productionAuth";

const router = Router();

router.get("/me", async (req, res) => {
  if (RESOLVED_APP_ENV !== "production") {
    res.status(404).json({ error: "This endpoint is only used for production authentication." });
    return;
  }

  const resolved = await resolveProductionUser(req);
  if (!("user" in resolved)) {
    res.status(resolved.status).json({ error: resolved.error });
    return;
  }

  res.json(resolved.user);
});

export default router;
