import { Router } from "express";
import { db, competenciesTable, insertCompetencySchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const roleId = req.query.roleId ? parseInt(req.query.roleId as string) : undefined;
  const competencies = roleId
    ? await db.select().from(competenciesTable).where(eq(competenciesTable.roleId, roleId)).orderBy(competenciesTable.category, competenciesTable.name)
    : await db.select().from(competenciesTable).orderBy(competenciesTable.category, competenciesTable.name);
  return res.json(competencies);
});

router.post("/", async (req, res) => {
  const result = insertCompetencySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  const [created] = await db.insert(competenciesTable).values(result.data).returning();
  return res.status(201).json(created);
});

export default router;
