import { Router } from "express";
import { db, probationActionEvidenceTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createSchema = z.object({
  actionId: z.number().int(),
  evidenceText: z.string().min(1),
});

router.get("/", async (req, res) => {
  const actionId = req.query.actionId ? parseInt(req.query.actionId as string) : undefined;
  if (!actionId || isNaN(actionId)) return res.status(400).json({ error: "actionId is required" });

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

  const [created] = await db
    .insert(probationActionEvidenceTable)
    .values(result.data)
    .returning();
  return res.json(created);
});

export default router;
