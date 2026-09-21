import { Router } from "express";
import { db, learningLogEntriesTable, insertLearningLogEntrySchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { employeeExists, parsePositiveIntegerQuery } from "../lib/employeeScope";

const router = Router();

// GET /api/learning-log?userId=:userId
router.get("/", async (req, res) => {
  const userId = parsePositiveIntegerQuery(req.query.userId);
  if (userId === null) return res.status(400).json({ error: "Invalid userId" });
  if (!(await employeeExists(userId))) {
    return res.status(404).json({ error: "Employee not found" });
  }

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
  const [created] = await db.insert(learningLogEntriesTable).values(result.data).returning();
  return res.status(201).json(created);
});

// DELETE /api/learning-log/:id
router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = parseInt(req.query.userId as string);
  if (isNaN(id) || isNaN(userId)) return res.status(400).json({ error: "Invalid id or userId" });
  await db
    .delete(learningLogEntriesTable)
    .where(and(eq(learningLogEntriesTable.id, id), eq(learningLogEntriesTable.userId, userId)));
  return res.status(204).send();
});

export default router;
