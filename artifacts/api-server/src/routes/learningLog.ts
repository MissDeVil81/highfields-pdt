import { Router } from "express";
import { db, learningLogEntriesTable, insertLearningLogEntrySchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireProductionUserAccess } from "../middlewares/productionAuth";

const router = Router();

// GET /api/learning-log?userId=:userId
router.get("/", async (req, res) => {
  const userId = parseInt(req.query.userId as string);
  if (isNaN(userId)) return res.status(400).json({ error: "userId is required" });
  if (!(await requireProductionUserAccess(req, res, userId, "view this learning log"))) return;
  const entries = await db
    .select()
    .from(learningLogEntriesTable)
    .where(eq(learningLogEntriesTable.userId, userId))
    .orderBy(learningLogEntriesTable.createdAt);
  return res.json(entries);
});

// POST /api/learning-log
router.post("/", async (req, res) => {
  const result = insertLearningLogEntrySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  if (!(await requireProductionUserAccess(req, res, result.data.userId, "add a learning-log entry for this person"))) return;
  const [created] = await db.insert(learningLogEntriesTable).values(result.data).returning();
  return res.status(201).json(created);
});

// DELETE /api/learning-log/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const [existing] = await db.select().from(learningLogEntriesTable).where(eq(learningLogEntriesTable.id, id));
  if (!existing) return res.status(404).json({ error: "Learning-log entry not found" });
  if (!(await requireProductionUserAccess(req, res, existing.userId, "delete this learning-log entry"))) return;
  await db
    .delete(learningLogEntriesTable)
    .where(eq(learningLogEntriesTable.id, id));
  return res.status(204).send();
});

export default router;
