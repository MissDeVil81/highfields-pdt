import { Router } from "express";
import { db, financialTargetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const roleId = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;
  if (!roleId) return res.status(400).json({ error: "roleId is required" });

  const targets = await db
    .select()
    .from(financialTargetsTable)
    .where(eq(financialTargetsTable.roleId, roleId))
    .orderBy(financialTargetsTable.sortOrder);

  return res.json(targets);
});

export default router;
