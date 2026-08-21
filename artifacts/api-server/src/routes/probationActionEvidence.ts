import { Router } from "express";
import { db, probationActionEvidenceTable, probationActionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireProductionUserAccess } from "../middlewares/productionAuth";

const router = Router();

const createSchema = z.object({
  actionId: z.number().int(),
  evidenceText: z.string().min(1),
});

router.get("/", async (req, res) => {
  const actionId = req.query.actionId ? parseInt(req.query.actionId as string) : undefined;
  if (!actionId || isNaN(actionId)) return res.status(400).json({ error: "actionId is required" });
  const [action] = await db.select().from(probationActionsTable).where(eq(probationActionsTable.id, actionId));
  if (!action || action.userId == null) return res.status(404).json({ error: "Probation action not found" });
  if (!(await requireProductionUserAccess(req, res, action.userId, "view this action evidence"))) return;

  const rows = await db
    .select()
    .from(probationActionEvidenceTable)
    .where(eq(probationActionEvidenceTable.actionId, actionId))
    .orderBy(probationActionEvidenceTable.createdAt);
  return res.json(rows);
});

router.post("/", async (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  const [action] = await db.select().from(probationActionsTable).where(eq(probationActionsTable.id, result.data.actionId));
  if (!action || action.userId == null) return res.status(404).json({ error: "Probation action not found" });
  if (!(await requireProductionUserAccess(req, res, action.userId, "add evidence to this probation action"))) return;

  const [created] = await db
    .insert(probationActionEvidenceTable)
    .values(result.data)
    .returning();
  return res.json(created);
});

export default router;
