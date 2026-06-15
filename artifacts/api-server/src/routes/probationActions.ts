import { Router } from "express";
import { db, probationActionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

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

  const [updated] = await db
    .update(probationActionsTable)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(probationActionsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });
  return res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(probationActionsTable).where(eq(probationActionsTable.id, id));
  return res.json({ ok: true });
});

export default router;
