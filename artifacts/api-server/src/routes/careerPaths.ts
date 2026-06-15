import { Router } from "express";
import { db, careerPathsTable, insertCareerPathSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const paths = await db.select().from(careerPathsTable).orderBy(careerPathsTable.name);
  return res.json(paths);
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [path] = await db.select().from(careerPathsTable).where(eq(careerPathsTable.id, id));
  if (!path) return res.status(404).json({ error: "Career path not found" });
  return res.json(path);
});

router.post("/", async (req, res) => {
  const result = insertCareerPathSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.message });
  const [created] = await db.insert(careerPathsTable).values(result.data).returning();
  return res.status(201).json(created);
});

export default router;
