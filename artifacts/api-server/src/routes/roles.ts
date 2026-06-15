import { Router } from "express";
import { db, rolesTable, competenciesTable, insertRoleSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const careerPathId = req.query.careerPathId ? parseInt(req.query.careerPathId as string) : undefined;
  const query = db.select().from(rolesTable).orderBy(rolesTable.level);
  const roles = careerPathId
    ? await db.select().from(rolesTable).where(eq(rolesTable.careerPathId, careerPathId)).orderBy(rolesTable.level)
    : await db.select().from(rolesTable).orderBy(rolesTable.level);
  return res.json(roles);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id));
  if (!role) return res.status(404).json({ error: "Role not found" });
  const competencies = await db.select().from(competenciesTable).where(eq(competenciesTable.roleId, id)).orderBy(competenciesTable.category, competenciesTable.name);
  return res.json({ ...role, competencies });
});

router.post("/", async (req, res) => {
  const result = insertRoleSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  const [created] = await db.insert(rolesTable).values(result.data).returning();
  return res.status(201).json(created);
});

export default router;
