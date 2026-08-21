import { Router } from "express";
import { db, probationActionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireProductionUserAccess } from "../middlewares/productionAuth";

const router = Router();

const createSchema = z.object({
  userId: z.number().int(),
  reviewPeriod: z.string(),
  actionText: z.string().min(1),
});

const updateSchema = z.object({
  actionText: z.string().min(1).optional(),
  status: z.enum(["not_started", "in_progress", "complete"]).optional(),
});

router.get("/", async (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const reviewPeriod = req.query.reviewPeriod as string | undefined;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!(await requireProductionUserAccess(req, res, userId, "view these probation actions"))) return;

  const conditions = [eq(probationActionsTable.userId, userId)];
  if (reviewPeriod) {
    conditions.push(eq(probationActionsTable.reviewPeriod, reviewPeriod));
  }

  const rows = await db.select().from(probationActionsTable).where(and(...conditions));
  return res.json(rows);
});

router.post("/", async (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  if (!(await requireProductionUserAccess(req, res, result.data.userId, "add a probation action for this person"))) return;

  const [created] = await db
    .insert(probationActionsTable)
    .values(result.data)
    .returning();
  return res.json(created);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  const [existing] = await db.select().from(probationActionsTable).where(eq(probationActionsTable.id, id));
  if (!existing || existing.userId == null) return res.status(404).json({ error: "Not found" });
  if (!(await requireProductionUserAccess(req, res, existing.userId, "update this probation action"))) return;

  const [updated] = await db
    .update(probationActionsTable)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(probationActionsTable.id, id))
    .returning();

  return res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(probationActionsTable).where(eq(probationActionsTable.id, id));
  if (!existing || existing.userId == null) return res.status(404).json({ error: "Not found" });
  if (!(await requireProductionUserAccess(req, res, existing.userId, "delete this probation action"))) return;

  await db.delete(probationActionsTable).where(eq(probationActionsTable.id, id));
  return res.json({ ok: true });
});

export default router;
