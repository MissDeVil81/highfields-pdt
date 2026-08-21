import { Router } from "express";
import { db, evidenceTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireProductionUserAccess } from "../middlewares/productionAuth";

const router = Router();

const createSchema = z.object({
  userId: z.number().int(),
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

router.get("/", async (req, res) => {
  const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
  const roleId = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;
  const competencyId = req.query.competencyId ? parseInt(req.query.competencyId as string) : undefined;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!(await requireProductionUserAccess(req, res, userId, "view this evidence"))) return;

  const conditions = [eq(evidenceTable.userId, userId)];
  if (roleId) conditions.push(eq(evidenceTable.roleId, roleId));
  if (competencyId) conditions.push(eq(evidenceTable.competencyId, competencyId));

  const evidence = await db.select().from(evidenceTable).where(and(...conditions)).orderBy(evidenceTable.createdAt);
  return res.json(evidence);
});

router.post("/", async (req, res) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  if (!(await requireProductionUserAccess(req, res, result.data.userId, "add evidence for this person"))) return;
  const [created] = await db.insert(evidenceTable).values(result.data).returning();
  return res.status(201).json(created);
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const result = updateSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  const [existing] = await db.select().from(evidenceTable).where(eq(evidenceTable.id, id));
  if (!existing || existing.userId == null) return res.status(404).json({ error: "Evidence not found" });
  if (!(await requireProductionUserAccess(req, res, existing.userId, "update this evidence"))) return;
  const [updated] = await db.update(evidenceTable).set({ ...result.data, updatedAt: new Date() }).where(eq(evidenceTable.id, id)).returning();
  return res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [existing] = await db.select().from(evidenceTable).where(eq(evidenceTable.id, id));
  if (!existing || existing.userId == null) return res.status(404).json({ error: "Evidence not found" });
  if (!(await requireProductionUserAccess(req, res, existing.userId, "delete this evidence"))) return;
  await db.delete(evidenceTable).where(eq(evidenceTable.id, id));
  return res.status(204).send();
});

export default router;
