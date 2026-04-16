import { Router } from "express";
import { db, evidenceTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

const createSchema = z.object({
  competencyId: z.number().int(),
  roleId: z.number().int(),
  title: z.string(),
  description: z.string(),
  rating: z.enum(["red", "amber", "green"]),
});

const updateSchema = z.object({
  title: z.string(),
  description: z.string(),
  rating: z.enum(["red", "amber", "green"]),
});

router.get("/", requireAuth, async (req, res) => {
  const sessionId = (req as any).userId as string;
  const roleId = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;
  const competencyId = req.query.competencyId ? parseInt(req.query.competencyId as string) : undefined;

  const conditions = [eq(evidenceTable.sessionId, sessionId)];
  if (roleId) conditions.push(eq(evidenceTable.roleId, roleId));
  if (competencyId) conditions.push(eq(evidenceTable.competencyId, competencyId));

  const evidence = await db.select().from(evidenceTable).where(and(...conditions)).orderBy(evidenceTable.createdAt);
  res.json(evidence);
});

router.post("/", requireAuth, async (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  const sessionId = (req as any).userId as string;
  const [created] = await db.insert(evidenceTable).values({ ...result.data, sessionId }).returning();
  res.status(201).json(created);
});

router.put("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  const [updated] = await db.update(evidenceTable).set({ ...result.data, updatedAt: new Date() }).where(eq(evidenceTable.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "Evidence not found" });
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(evidenceTable).where(eq(evidenceTable.id, id));
  res.status(204).send();
});

export default router;
